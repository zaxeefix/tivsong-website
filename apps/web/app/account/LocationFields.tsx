"use client";

import {useMemo,useState} from "react";

const countryCodes="AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(" ");
const nigeriaStates="Abia|Adamawa|Akwa Ibom|Anambra|Bauchi|Bayelsa|Benue|Borno|Cross River|Delta|Ebonyi|Edo|Ekiti|Enugu|Federal Capital Territory|Gombe|Imo|Jigawa|Kaduna|Kano|Katsina|Kebbi|Kogi|Kwara|Lagos|Nasarawa|Niger|Ogun|Ondo|Osun|Oyo|Plateau|Rivers|Sokoto|Taraba|Yobe|Zamfara".split("|");
const benueLgas="Ado|Agatu|Apa|Buruku|Gboko|Guma|Gwer East|Gwer West|Katsina-Ala|Konshisha|Kwande|Logo|Makurdi|Obi|Ogbadibo|Ohimini|Oju|Okpokwu|Otukpo|Tarka|Ukum|Ushongo|Vandeikya".split("|");

export default function LocationFields(){
  const names=useMemo(()=>new Intl.DisplayNames(["en"],{type:"region"}),[]),[country,setCountry]=useState("Nigeria"),[state,setState]=useState("Benue");
  const countries=useMemo(()=>countryCodes.map(code=>names.of(code)).filter((name):name is string=>Boolean(name)).sort(),[names]);
  const states=country==="Nigeria"?nigeriaStates:["Outside Nigeria / not listed"];
  const localGovernments=country==="Nigeria"&&state==="Benue"?benueLgas:["Not applicable / not listed"];
  return <><label>Country<select name="country" value={country} onChange={event=>{const value=event.target.value;setCountry(value);setState(value==="Nigeria"?"Benue":"Outside Nigeria / not listed")}} required>{countries.map(item=><option key={item}>{item}</option>)}</select></label><label>State / province<select name="state" value={state} onChange={event=>setState(event.target.value)} required>{states.map(item=><option key={item}>{item}</option>)}</select></label><label>Local government<select name="localGovernment" required>{localGovernments.map(item=><option key={item}>{item}</option>)}</select></label></>;
}
