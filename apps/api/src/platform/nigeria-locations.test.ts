import {describe,expect,it} from "vitest";
import {getLGAs,getLGAsByState,getStates} from "@some19ice/nigeria-geo-core";
import {validateNigeriaLocation} from "./nigeria-locations.js";

describe("Nigeria location data",()=>{
  const states=getStates();
  const lgas=getLGAs();

  it("contains all 36 states, FCT and exactly 774 local areas",()=>{
    expect(states).toHaveLength(37);
    expect(lgas).toHaveLength(774);
    expect(states.some(state=>state.id==="fct"&&state.name==="Federal Capital Territory")).toBe(true);
  });

  it("assigns every unique LGA to exactly one valid state",()=>{
    expect(new Set(lgas.map(lga=>lga.id)).size).toBe(774);
    expect(lgas.every(lga=>states.some(state=>state.id===lga.stateId))).toBe(true);
    for(const state of states){
      const stateLgas=getLGAsByState(state.id);
      expect(new Set(stateLgas.map(lga=>lga.name.toLocaleLowerCase("en-NG"))).size).toBe(stateLgas.length);
    }
  });

  it("contains the six FCT Area Councils",()=>{
    expect(getLGAsByState("fct").map(lga=>lga.name).sort()).toEqual([
      "Abaji","Bwari","Gwagwalada","Kuje","Kwali","Municipal Area Council"
    ]);
  });

  it("preserves Benue registration and rejects a mismatched LGA",()=>{
    expect(getLGAsByState("benue")).toHaveLength(23);
    expect(validateNigeriaLocation("Benue","Makurdi")).toEqual({valid:true,state:"Benue",localGovernment:"Makurdi"});
    expect(validateNigeriaLocation("Lagos","Makurdi")).toMatchObject({valid:false,field:"localGovernment"});
  });
});
