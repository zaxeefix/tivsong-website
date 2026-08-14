import {getLGAById,getLGAsByState,getStateById,getStateByName} from "@some19ice/nigeria-geo-core";

const clean=(value:string)=>value.trim().replace(/\s+/g," ");
const comparable=(value:string)=>clean(value).toLocaleLowerCase("en-NG");

export type NigeriaLocationResult=
  | {valid:true;state:string;localGovernment:string}
  | {valid:false;field:"state"|"localGovernment";message:string};

export function isNigeria(country:string|undefined):boolean{
  return comparable(country||"")==="nigeria";
}

export function validateNigeriaLocation(stateValue:string|undefined,lgaValue:string|undefined):NigeriaLocationResult{
  const stateInput=clean(stateValue||"");
  if(!stateInput)return {valid:false,field:"state",message:"Select a Nigerian state or the Federal Capital Territory"};
  const stateAlias=comparable(stateInput);
  const state=stateAlias==="fct"||stateAlias==="abuja"||stateAlias==="federal capital territory (fct)"
    ?getStateById("fct")
    :getStateById(stateAlias.replace(/\s+/g,"-"))||getStateByName(stateInput);
  if(!state)return {valid:false,field:"state",message:"Select a valid Nigerian state or the Federal Capital Territory"};

  const lgaInput=clean(lgaValue||"");
  if(!lgaInput)return {valid:false,field:"localGovernment",message:"Select a local government area for the chosen state"};
  const lga=getLGAsByState(state.id).find(item=>comparable(item.name)===comparable(lgaInput)||item.id===comparable(lgaInput).replace(/\s+/g,"-"));
  if(!lga||getLGAById(lga.id)?.stateId!==state.id){
    return {valid:false,field:"localGovernment",message:`${lgaInput} is not a local government area in ${state.name}`};
  }
  return {valid:true,state:state.name,localGovernment:lga.name};
}
