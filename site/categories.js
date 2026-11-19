/* Subject-scoped display taxonomy. Source records, paths, years and files are retained. */
(function(root){'use strict';
 const GENERAL='General & other resources',REVISION='Revision & assessment';
 const rule=(label,strand,re)=>({label,strand,re});
 const revision=/\b(?:revision|review|exams?|tests?|quiz(?:zes)?|assessment|naplan|est)\b/i;
 const mathematics=[
  rule('Probability','Probability and statistics',/\b(?:probabilit\w*|chance|likelihood|sample spaces?|venn|tree diagrams?|two.way tables?|relative frequenc\w*|combinations?|permutations?)\b/i),
  rule('Statistics & data','Probability and statistics',/\b(?:statistic\w*|data|bivariate|univariate|histograms?|box.?plots?|dot.?plots?|stem.and.leaf|scatter\w*|mean|median|mode|range|quartiles?|percentiles?|populations?|samples?|sampling|correlation|regression|time series|normal distribution|frequency|standard deviation)\b/i),
  rule('Calculus','Number and algebra',/\b(?:calculus|differentiat\w*|derivatives?|integrat\w*|antiderivatives?|anti.derivatives?|limits?|stationary points?|rates? of change|trapezoidal rule)\b/i),
  rule('Trigonometry','Measurement and geometry',/\b(?:trigonometr\w*|sohcahtoa|sine|cosine|tangent|radians?|circular (?:measure|functions?)|unit circle|bearings?)\b/i),
  rule('Pythagoras & right-angled triangles','Measurement and geometry',/\b(?:pythagor\w*|hypotenuse|right.angled triangles?)\b/i),
  rule('Financial mathematics','Number and algebra',/\b(?:financ\w*|money|interest|loans?|annuities|annuity|depreciation|tax(?:ation)?|gst|budget\w*|best buys?|income|wages?|salary|salaries|discounts?|profit|loss|invest\w*|bank\w*|repayments?)\b/i),
  rule('Ratio, rates & proportion','Number and algebra',/\b(?:ratios?|rates?|proportion\w*|scale drawings?|unit pricing)\b/i),
  rule('Fractions, decimals & percentages','Number and algebra',/\b(?:fractions?|decimals?|percent\w*|fdp)\b/i),
  rule('Indices, surds & logarithms','Number and algebra',/\b(?:indices|index|powers?|exponent\w*|logarithm\w*|surds?|scientific notation|standard form|square roots?|roots?)\b/i),
  rule('Equations & inequalities','Number and algebra',/\b(?:equations?|inequalit\w*|simultaneous|solving|solve|transpos\w*)\b/i),
  rule('Functions, graphs & relationships','Number and algebra',/\b(?:functions?|graphs?|graphing|linear|non.linear|quadratic\w*|parabol\w*|gradient|slope|intercept|midpoints?|coordinate\w*|cartesian|relations?|relationships?)\b/i),
  rule('Algebraic techniques & patterns','Number and algebra',/\b(?:algebra\w*|factor\w*|expan\w*|simplif\w*|substitut\w*|expressions?|polynomial\w*|binomial\w*|patterns?|sequences?|series|formulas?|formulae|recursion|recursive|matrices|matrix|networks?)\b/i),
  rule('Measurement','Measurement and geometry',/\b(?:measur\w*|area|perimeter|circumference|volume|surface|capacity|metric|units of measurement|conversion\w*|converting units|time|length|mass|temperature)\b/i),
  rule('Geometry & transformations','Measurement and geometry',/\b(?:geometr\w*|shapes?|angles?|triangles?|polygons?|circles?|prisms?|pyramids?|nets?|congru\w*|similarity|symmetr\w*|reflect\w*|rotat\w*|translat\w*|dilat\w*|transform\w*|construction\w*|tessellat\w*|quadrilater\w*|parallel|perpendicular)\b/i),
  rule('Number & operations','Number and algebra',/\b(?:numbers?|numer\w*|integers?|rational|irrational|real numbers?|absolute|addition|adding|add|subtraction|subtract\w*|multipli\w*|division|divid\w*|arithmetic|bimdas|bodmas|bidmas|round\w*|estimat\w*|place value|prime|factors?|multiples?|divisib\w*)\b/i)
 ];
 const biology=[
  rule('Coordination & homeostasis','Biological Sciences',/\b(?:nerv\w*|neurons?|brain|reflex\w*|reaction time|endocrine|hormon\w*|homeostas\w*|thermoreg\w*|integument\w*|skin|blood glucose)\b/i),
  rule('Immunity & disease','Biological Sciences',/\b(?:immun\w*|lymph\w*|disease\w*|pathogen\w*|infect\w*|stis?|sexually transmitted|vaccin\w*|antibod\w*|bacteri\w*|virus\w*)\b/i),
  rule('Genetics & reproduction','Biological Sciences',/\b(?:dna|rna|genetic\w*|inherit\w*|chromosom\w*|alleles?|mitosis|meiosis|reproduc\w*|fertilis\w*|pregnan\w*|embryo\w*|foetal|fetal|birth|stem cells?|spermatogen\w*|oogen\w*|contracept\w*|gene expression)\b/i),
  rule('Evolution & adaptations','Biological Sciences',/\b(?:evolut\w*|adaptat\w*|natural selection|speciation|darwin\w*|fossil evidence|human ancestors?|homin\w*|primates?)\b/i),
  rule('Cells & biological molecules','Biological Sciences',/\b(?:cells?|tissues?|microscop\w*|organelle\w*|diffusion|osmosis|membran\w*|metaboli\w*|biological molecules?|molecules of life|protein synthesis|enzym\w*|biochem\w*|photosynth\w*|respiration|life processes)\b/i),
  rule('Body systems & health','Biological Sciences',/\b(?:heart|blood|cardiac|cardiovasc\w*|circulat\w*|respiratory|breathing|digest\w*|nutrition|excret\w*|urinary|kidneys?|gas exchange|absorption|elimination|removal of waste|joints?|skelet\w*|muscl\w*|health)\b/i),
  rule('Ecosystems & biodiversity','Biological Sciences',/\b(?:ecolog\w*|ecosystem\w*|habitat\w*|food chains?|food webs?|biotic|abiotic|biodiversity|classification|classif\w*|branched keys?|tabular keys?|dichotomous|kingdoms?|introduced species|cane toads?|populations?|organisms?|living things|animals?|plants?)\b/i)
 ];
 const chemistry=[
  rule('Organic chemistry','Chemical Sciences',/\b(?:organic|hydrocarbon\w*|alkanes?|alkenes?|alcohols?|esters?|polymers?|functional groups?|isomer\w*|aromatic)\b/i),
  rule('Chemical calculations & equilibrium','Chemical Sciences',/\b(?:moles?|stoichi\w*|equilibrium|concentration|titration\w*|volumetric|chemical calculations?|percentage composition|calibration|enthalpy|thermochem\w*|activation energy|reaction rates?|rates? of reaction|energy profile)\b/i),
  rule('Atomic structure & bonding','Chemical Sciences',/\b(?:atomic|atoms?|ions?|isotop\w*|electron\w*|periodic|elements?|molecules?|compounds?|bonding|molecular shapes?|intermolecular|polarity|dipoles?|metallic|metals?|non.metals?|covalent|formulas?|formulae)\b/i),
  rule('Chemical reactions & acids','Chemical Sciences',/\b(?:reactions?|acids?|bases?|ph|neutralis\w*|oxidation|reduction|redox|corrosion|electrochem\w*|electrolys\w*|equations?|combustion|precipitat\w*|solubility|green chemistry)\b/i),
  rule('Matter, mixtures & separation','Chemical Sciences',/\b(?:matter|particles?|solids?|liquids?|gases?|mixtures?|separat\w*|filtrat\w*|distillat\w*|chromatograph\w*|solutions?|dissolv\w*|density|boil\w*|melt\w*|evaporat\w*|physical propert\w*|chemical propert\w*|kinetic theory|gas laws?|solvents?|materials?|nano\w*|changing states|states of matter)\b/i)
 ];
 const physics=[
  rule('Nuclear & modern physics','Physical Sciences',/\b(?:nuclear|radioactiv\w*|ionising|quantum|photons?|photoelectric|particle physics|standard model|relativit\w*|time dilation|length contraction|mass.energy|black.body|spectra|wave.particle|matter as a wave|light as a particle|particle accelerator|particle interaction)\b/i),
  rule('Electricity & magnetism','Physical Sciences',/\b(?:electric\w*|dc motors?|generators?|transformers?|applications of em|circuits?|cell phones?|mobile phones?|current|voltage|resistors?|resistance|ohm\w*|magnet\w*|electromagnet\w*|induction|charge\w*|static)\b/i),
  rule('Heat & thermal physics','Physical Sciences',/\b(?:thermal|heat\w*|temperature|conduction|convection|calorimetry|cooling)\b/i),
  rule('Waves, light & sound','Physical Sciences',/\b(?:waves?|light|sound|optic\w*|lens|lenses|reflect\w*|refract\w*|colours?|colors?|electromagnetic spectrum|doppler|interference|eye|absorption)\b/i),
  rule('Motion, forces & energy','Physical Sciences',/\b(?:motion|forces?|newton\w*|velocity|speed|accelerat\w*|momentum|projectiles?|displacement|distance.time|friction|gravit\w*|energy|work and power|simple machines?|levers?|rockets?|car safety|pendulum\w*|vectors?|equilibrium|torque|circular|inclined planes?|banked turns?|screws?|wedges?|wheels?)\b/i)
 ];
 const earth=[
  rule('Space & astronomy','Earth and Space Sciences',/\b(?:space|astronom\w*|stars?|solar|planets?|galax\w*|universe|big bang|moons?|nebula\w*|black holes?|kepler|satellites?|orbits?|cosmolog\w*|light years?)\b/i),
  rule('Earth resources & environment','Earth and Space Sciences',/\b(?:climate|atmospher\w*|greenhouse|carbon cycle|water cycle|fossil fuels?|coal|oil|renewable|sustainab\w*|resources?|environment\w*|weather|ozone|spheres of the earth|earth.?s systems?)\b/i),
  rule('Rocks, minerals & Earth processes','Earth and Space Sciences',/\b(?:rocks?|minerals?|geolog\w*|tectonic\w*|continental|volcano\w*|earthquakes?|weathering|erosion|sediment\w*|igneous|metamorph\w*|mining|earth.?s structure|structure of the earth|fossils?)\b/i)
 ];
 const inquiry=rule('Scientific inquiry & lab skills','Science Inquiry',/\b(?:scientific method|scientifically|variables?|hypothes\w*|observations?|inferences?|graphing|interpreting graphs|safety|branches of science|what is science|investigat\w*|measur\w*|laboratory|lab equipment|bunsen|research methods?|experiments?|fair tests?|validity|reliability)\b/i);
 const psychology=[
  rule('Psychology: social behaviour','Social psychology',/\b(?:social|attitudes?|stereotyp\w*|attribut\w*|dissonance|attachment|persuasion|aggression|antisocial|groups?|conform\w*|obedien\w*|identity|bystander)\b/i),
  rule('Psychology: development','Developmental psychology',/\b(?:development\w*|piaget\w*|lifespan|adolescen\w*|infancy|childhood|aging|ageing)\b/i),
  rule('Psychology: learning & memory','Learning and cognition',/\b(?:learning|condition\w*|reinforc\w*|punish\w*|memory|forget\w*|cognit\w*|behaviour modification|pavlov|skinner\w*)\b/i),
  rule('Psychology: biological bases','Biological psychology',/\b(?:neurons?|brain|nerv\w*|genes?|genetic\w*|biological|sensation|perception)\b/i),
  rule('Psychology: research methods','Research methods',/\b(?:research|methodolog\w*|experiments?|ethical|ethics|validity|reliability|sampling|data analysis|data presentation|variables?|hypothes\w*)\b/i)
 ];
 const hass=[
  rule('History: ancient civilisations','History',/\b(?:ancient|civilisations?|civilizations?|greece|greek|greeks|minoans?|mycena\w*|mycene\w*|rome|roman|romans|troy|trojan|macedoni\w*|alexander|caesar|sulla|marius|pompey|mythology|cleopatra|sparta\w*|athens|egypt\w*)\b/i),
  rule('History: medieval & modern worlds','History',/\b(?:history|historical|medieval|middle ages|feudal\w*|renaissance|reformation|world wars?|ww[12i]+|industrial revolution|colonial\w*|colonisation|colonization|black death|crusades?|vikings?|shogun\w*|holocaust|cold war|rights and freedoms|making a nation|silk road)\b/i),
  rule('Civics & citizenship','Civics and Citizenship',/\b(?:civics?|citizenship|democra\w*|parliament\w*|government|constitution\w*|elections?|voting|politic\w*|laws?|legal|justice|courts?|separation of powers|federation|westminster|dispute|rights|responsibilit\w*)\b/i),
  rule('Economics & business','Economics and Business',/\b(?:economic\w*|rconomics|business|entrepreneur\w*|consumers?|producers?|supply|demand|markets?|scarcity|trade|trading|advertis\w*|finance|income|employment|unemployment|living standards|budget\w*)\b/i),
  rule('Geography: landscapes & natural hazards','Geography',/\b(?:landscapes?|landforms?|natural hazards?|earthquakes?|volcano\w*|tectonic\w*|tsunamis?|cyclones?|flood\w*|bushfires?|erosion|earth.?s structure)\b/i),
  rule('Geography: environments & resources','Geography',/\b(?:geograph\w*|environment\w*|sustainab\w*|climate|biomes?|water|resources?|food security|interconnections|globalisation|globalization|spatial|liveab\w*|livab\w*|urban\w*|settlements?|population|wellbeing|human well.being|cities|city|place)\b/i)
 ];
 const hpe=[
  rule('Movement & physical activity','Movement and physical activity',/\b(?:movement|physical activity|sport\w*|fitness|exercise|training|biomechan\w*|motor skills?|pe studies|physiology|coaching|performance)\b/i),
  rule('Health, identity & relationships','Personal, social and community health',/\b(?:health|identity|relationships?|beliefs?|values?|attitudes?|all about me|self|communicat\w*|emotions?|mental|puberty|sexual\w*|contracept\w*|stis?|pregnan\w*|consent|resilience|wellbeing)\b/i),
  rule('Safety & healthy choices','Personal, social and community health',/\b(?:safety|safe|online|cyber\w*|bullying|drugs?|alcohol|smoking|vaping|nutrition|diet|food|risk|first aid)\b/i)
 ];
 const scienceRules=[...biology,...chemistry,...physics,...earth,inquiry];
 const sourceStrand={Chemistry:'Chemical Sciences',Biology:'Biological Sciences','Human Biology':'Biological Sciences','Human Biology General':'Biological Sciences',Physics:'Physical Sciences','Earth and Space Science':'Earth and Space Sciences','Earth and Environmental Science':'Earth and Space Sciences'};
 const bioSubjects=['Biology','Human Biology','Human Biology General'];
 function words(value){return String(value||'').normalize('NFKC').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/(^|\s)\d+(?=[A-Za-z])/g,'$1').replace(/[_+]/g,' ').replace(/\s+/g,' ').trim();}
 function family(item){const s=item.subject;
  if(/^Mathematics\b|^Maths\b/i.test(s))return 'mathematics';
  if(/^(?:HASS|Humanities(?: and Social Sciences)?|History|Ancient History|Modern History|Geography|Civics(?: and Citizenship)?|Economics(?: and Business)?|Politics and Law)$/i.test(s))return 'hass';
  if(/^(?:HPE|Health(?: and Physical Education)?|Physical Education|Physical Education Studies|PE Studies)$/i.test(s))return 'hpe';
  if(s==='Psychology')return 'psychology';
  if(sourceStrand[s]||s==='Science'||s==='Science in Practice')return 'science';
  return '';
 }
 function lowerSchool(item){return item.years?.length>0&&item.years.every(y=>Number(y)>=7&&Number(y)<=10);}
 function rulesFor(item){switch(family(item)){
  case 'mathematics':return mathematics;case 'hass':{const strand=defaultStrand(item,'hass');return strand==='General resources & revision'?hass:hass.filter(r=>r.strand===strand);}case 'hpe':return hpe;case 'psychology':return psychology;
  case 'science':if(lowerSchool(item)){const strand=sourceStrand[item.subject];return strand?[...scienceRules.filter(r=>r.strand===strand),...scienceRules.filter(r=>r.strand!==strand)]:scienceRules;}if(['Science','Science in Practice'].includes(item.subject))return scienceRules;
   if(bioSubjects.includes(item.subject))return [...biology,inquiry];
   if(item.subject==='Chemistry')return [...chemistry,inquiry];
   if(item.subject==='Physics')return [...physics,inquiry];
   return [...earth,inquiry];
  default:return [];
 }}
 function contexts(item){
  // The filename is useful when the first slide is a generic activity or long lesson instruction.
  const filename=String(item.sourcePath||'').split('/').pop()?.replace(/\.[^.]+$/,'')||'';
  const title=words(item.title),file=words(filename);
  const generic=/^(?:\d+[. -]*)?(?:do now|learning intentions?|learning objectives?|success criteria|starter|warm up|lesson agenda|all about me|unit \d+|term \d+|page setup)$/i;
  const texts=generic.test(title)||title.length>180?[file,title]:[title,file];
  const folders=String(item.topic||'').split('/').map(words).filter(Boolean).reverse();
  return {texts:[...texts,words(item.searchText||item.description||"")],folders};
 }
 function match(rules,texts){for(const text of texts)for(const r of rules)if(r.re.test(text))return r;return null;}
 function classify(item){
  const type=family(item),rules=rulesFor(item),{texts,folders}=contexts(item);
  let found=match(rules,texts);
  // Revision is a resource type, but a named curriculum topic still takes precedence.
  if(!found&&texts.some(t=>revision.test(t)))return result(REVISION,defaultStrand(item,type),item,type);
  if(!found)found=match(rules,folders);
  if(found)return result(found.label,found.strand,item,type);
  return result(GENERAL,defaultStrand(item,type),item,type);
 }
 function defaultStrand(item,type){
  if(type==='science')return sourceStrand[item.subject]||'General science & revision';
  if(type==='hass'){
   const context=words(item.subject+' / '+(item.topic||''));
   if(/\b(?:history|ancient|modern)\b/i.test(context))return 'History';
   if(/\bgeography\b/i.test(context))return 'Geography';
   if(/\b(?:civics?|politics|law)\b/i.test(context))return 'Civics and Citizenship';
   if(/\b(?:economics|rconomics|business)\b/i.test(context))return 'Economics and Business';
  }
  if(type==='hpe'&&/\b(?:health|pe studies)\b/i.test(item.topic||''))return /\bpe studies\b/i.test(item.topic)?'Movement and physical activity':'Personal, social and community health';
  return 'General resources & revision';
 }
 function result(topic,strand,item,type){return {topic,strand,subject:type==='science'&&lowerSchool(item)?'Science':item.subject};}
 function topic(item){return classify(item).topic;}
 root.PowerPointCategories={topic,classify,family};
})(typeof window==='undefined'?globalThis:window);

(function(root){
const areaMap={science:'Science',mathematics:'Mathematics',hass:'Humanities and Social Sciences',hpe:'Health and Physical Education',psychology:'Science'};
function enrich(b){
 const parts=String(b.sourcePath||'').split('/');let years=b.years||[],subject=b.subject;
 for(let i=0;i<parts.length-1;i++){const m=parts[i].match(/^(?:Year[ _-]*)?(0?[1-9]|1[0-2])$/i);if(m){if(!years.length)years=[Number(m[1])];if(!subject||subject==='Uncategorised')subject=parts[i-1];}}
 if(years.some(y=>y>=11)&&subject==='Science'){const course=parts.find(v=>/^(Human Biology(?: General)?|Biology|Chemistry|Physics|Psychology|Earth and Environmental Science|Science in Practice)$/i.test(v));if(course)subject=course;}
 subject=({HASS:'HASS',Maths:'Mathematics'})[subject]||subject||'Other';
 const input={...b,subject,years,topic:b.topic||parts.slice(2,-1).join(" / ")};const cat=root.PowerPointCategories.classify(input),family=root.PowerPointCategories.family(input);
 const area=areaMap[family]||subject;let strand=cat.strand,topic=cat.topic;subject=cat.subject;
 if(area==='Humanities and Social Sciences'&&['History','Geography','Civics and Citizenship','Economics and Business'].includes(strand)){subject=strand;strand=subject==='History'?'Historical Knowledge and Understanding':subject==='Geography'?'Geographical Knowledge and Understanding':subject;}
 if(area==='Mathematics')strand=/statistics/i.test(topic)?'Statistics':/probability/i.test(topic)?'Probability':/geometry|transform|similar|congruen/i.test(topic)?'Space':/measurement|trigonom|pythagoras/i.test(topic)?'Measurement':/algebra|function|equation|indices|calculus/i.test(topic)?'Algebra':'Number';
 const senior=years.some(y=>y>=11);let pathway=b.pathway||(/\bgeneral\b/i.test(b.subject)?'General':/\bATAR\b/i.test(b.subject+' '+b.title+' '+b.sourcePath)?'ATAR':'');
 const text=b.title+' '+(b.topic||'');
 if(area==='Science'&&!senior)subject='Science';
 const unitMatch=senior?text.match(/\bunits?\s*([1-4])(?:\s*(?:and|&|[-–])\s*([1-4]))?/i):null;
 const unit=b.unit||(unitMatch?'Unit '+unitMatch[1]+(unitMatch[2]?'–'+unitMatch[2]:''):'');
 const review=topic==='General & other resources';if(review)topic='Other '+subject+' resources';
 return {...b,title:b.title.replace(/\s+Atomi$/i,''),years,subject,sourceSubject:b.subject,area,strand,categoryTopic:topic,pathway,unit,classificationStatus:review?'Needs curriculum review':'Topic classified',resourceType:b.format||'Link'};
}
root.LibraryCurriculum={enrich};
})(typeof window==='undefined'?globalThis:window);
