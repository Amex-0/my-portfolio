"use client";

import { useEffect, useRef } from "react";
import Matter from "matter-js";

const ITEMS = [
  { id: 1, label: "C++", className: "bg-yellow-400 text-black" },
  { id: 2, label: "C#", className: "bg-purple-600 text-white" },
  { id: 3, label: "REACT", className: "bg-red-500 text-white" },
  { id: 4, label: "NEXTJS", className: "bg-blue-500 text-white" },
  { id: 5, label: "REACT NATIVE", className: "bg-green-500 text-black" },
  { id: 6, label: "CSS", className: "bg-white text-black border border-black" },
  { id: 7, label: "JAVASCRIPT", className: "bg-pink-500 text-white" },
  { id: 8, label: "PHP", className: "bg-orange-500 text-black" },
];

export default function PhysicsSandbox() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const itemsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sceneElement = sceneRef.current;
    const itemsContainer = itemsContainerRef.current;
    if (!sceneElement || !itemsContainer) return;

    let engine: any = null;
    let runner: any = null;
    let rafId = 0;
    let physicsObjects: any[] = [];

    const startPhysics = () => {
      if (engine) return; // already started
      const { Engine, World, Bodies, Runner, Mouse, MouseConstraint } = Matter;

      engine = Engine.create({ gravity: { x: 0, y: 1 } });

      const width = sceneElement.clientWidth;
      const height = sceneElement.clientHeight;

      const wallThickness = 100;
      const floor = Bodies.rectangle(width / 2, height + wallThickness / 2, width * 2, wallThickness, { isStatic: true });
      const leftWall = Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true });
      const rightWall = Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true });

      World.add(engine.world, [floor, leftWall, rightWall]);

      const domElements = Array.from(itemsContainer.children) as HTMLElement[];
      physicsObjects = domElements.map((el, index) => {
        const rect = el.getBoundingClientRect();
        const x = Math.random() * (width - 200) + 100;
        const y = -50 - index * 60;

        const body = Bodies.rectangle(x, y, rect.width, rect.height, {
          restitution: 0.6,
          friction: 0.1,
          angle: (Math.random() - 0.5) * 0.5,
        });
        (body as Matter.Body & { domElement?: HTMLElement }).domElement = el;
        return body;
      });

      const updateDOM = () => {
        physicsObjects.forEach((body) => {
          const el = (body as Matter.Body & { domElement?: HTMLElement }).domElement;
          if (!el) return;
          const x = body.position.x - el.offsetWidth / 2;
          const y = body.position.y - el.offsetHeight / 2;
          el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${body.angle}rad)`;
          el.style.visibility = "visible";
        });
        rafId = requestAnimationFrame(updateDOM);
      };

      World.add(engine.world, physicsObjects);

      const mouse = Mouse.create(sceneElement);
      const mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: { stiffness: 0.2, render: { visible: false } },
      });
      World.add(engine.world, mouseConstraint);

      runner = Runner.create();
      Runner.run(runner, engine);
      rafId = requestAnimationFrame(updateDOM);
    };

    const stopPhysics = () => {
      if (!engine) return;
      const { Runner, Engine, World } = Matter;
      Runner.stop(runner);
      cancelAnimationFrame(rafId);
      Engine.clear(engine);
      World.clear(engine.world, false);
      engine = null;
      runner = null;
      physicsObjects = [];
    };

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) startPhysics();
          else stopPhysics();
        });
      },
      { root: null, threshold: 0.2 }
    );

    obs.observe(sceneElement);

    return () => {
      obs.disconnect();
      stopPhysics();
    };
  }, []);

  return (
    <section
      ref={sceneRef}
      className="relative h-screen w-full overflow-hidden bg-gradient-to-b from-zinc-900 to-black"
    >
      {/* Background watermark text */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <h2 className="text-[20vw] font-black tracking-tighter text-white/5 select-none">
          SKILLS
        </h2>
      </div>

      {/* Physics items */}
      <div ref={itemsContainerRef} className="absolute inset-1">
        {ITEMS.map((item) => (
          <div
            key={item.id}
            className={`absolute left-0 top-0 inline-block px-6 py-3 text-2xl font-bold rounded-full shadow-lg cursor-grab active:cursor-grabbing ${item.className}`}
            style={{ visibility: "hidden", willChange: "transform" }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </section>
  );
}
