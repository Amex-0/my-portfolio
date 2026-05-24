import dynamic from "next/dynamic";

export const components = {
  hero: dynamic(() => import("./Hero")),
};
