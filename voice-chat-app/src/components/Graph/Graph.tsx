import React, { useRef, useEffect } from "react";

export function MyGeoGebraComponent({ a, h, k, customText }) {
    const ggbContainerRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
      if (typeof window.GGBApplet !== "function") return;
  
      // Set ggbOnInit BEFORE injecting
  
      console.log(a, h, k, customText);
      window.ggbOnInit = function(api) {
        try { api.evalCommand('Delete[f]'); } catch {}
        try { api.evalCommand('Delete[Text1]'); } catch {}
        api.evalCommand(`f(x) = 2(x - 2)^2 + 3`);
        api.evalCommand(`Text1 = Text("${customText}", (2, 8))`);
      };
  
      if (ggbContainerRef.current) {
        ggbContainerRef.current.innerHTML = "";
      }
  
      const params = {
        appName: "graphing",
        width: 800,
        height: 600,
        showToolBar: false,
        showAlgebraInput: false,
        showMenuBar: false,
        id: "ggbApplet"
      };
      const applet = new window.GGBApplet(params, true);
      applet.inject(ggbContainerRef.current);
    }, [a, h, k, customText]);
  
    return <div ref={ggbContainerRef}></div>;
  }
  