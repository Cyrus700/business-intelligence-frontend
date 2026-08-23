"use client";
import React, { createContext, useContext, useState } from "react";
const Ctx = createContext<any>(null);
export function PbFilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState({});
  const toggleDim = (k:string, v:string)=> setFilters((p:any)=> ({...p, [k]: v}));
  return <Ctx.Provider value={{...filters, toggleDim}}>{children}</Ctx.Provider>;
}
export function usePbFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) return { toggleDim: ()=>{}, region: null, channel: null, category: null } as any;
  return ctx;
}
