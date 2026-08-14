"use client";

import {useMemo,useState} from "react";
import {getLGAsByState,getStates} from "@some19ice/nigeria-geo-core";

const countryCodes="AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(" ");
const nigeriaStates=getStates().slice().sort((a,b)=>a.name.localeCompare(b.name,"en-NG"));

export default function LocationFields(){
  const names=useMemo(()=>new Intl.DisplayNames(["en"],{type:"region"}),[]),[country,setCountry]=useState(""),[stateId,setStateId]=useState(""),[lgaId,setLgaId]=useState("");
  const countries=useMemo(()=>countryCodes.map(code=>names.of(code)).filter((name):name is string=>Boolean(name)).sort(),[names]);
  const selectedState=nigeriaStates.find(item=>item.id===stateId);
  const localGovernments=useMemo(()=>stateId?getLGAsByState(stateId).slice().sort((a,b)=>a.name.localeCompare(b.name,"en-NG")):[],[stateId]);
  const nigeria=country==="Nigeria";
  return <>
    <label>Country<select name="country" value={country} onChange={event=>{setCountry(event.target.value);setStateId("");setLgaId("")}} required><option value="">Select country</option>{countries.map(item=><option key={item} value={item}>{item}</option>)}</select></label>
    {nigeria?<>
      <label>State / FCT<select name="stateId" value={stateId} onChange={event=>{setStateId(event.target.value);setLgaId("")}} disabled={!country} required><option value="">Select state</option>{nigeriaStates.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <input type="hidden" name="state" value={selectedState?.name||""}/>
      <label>Local government area<select name="localGovernmentId" value={lgaId} onChange={event=>setLgaId(event.target.value)} disabled={!stateId} required><option value="">Select local government area</option>{localGovernments.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <input type="hidden" name="localGovernment" value={localGovernments.find(item=>item.id===lgaId)?.name||""}/>
      <p aria-live="polite" className="location-status">{stateId?`${localGovernments.length} local government areas available for ${selectedState?.name}.`:"Select a state to load its local government areas."}</p>
    </>:<>
      <label>State / province / region<input name="state" disabled={!country} required placeholder="Enter state, province, region, county or territory" maxLength={120}/></label>
      <label>City / local area <span>(optional)</span><input name="localGovernment" disabled={!country} placeholder="Enter city or local area" maxLength={120}/></label>
    </>}
  </>;
}
