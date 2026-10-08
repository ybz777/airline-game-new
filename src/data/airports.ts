export interface Airport {
  id: string
  icao: string
  name: string
  city: string
  country: string
  region: string
  theater: string
  lat: number
  lon: number
  size: 'regional' | 'medium' | 'large' | 'hub'
  demand: number
  business: number
  tourism: number
  cargo: number
  feeIndex: number
  playerSlots: number
  runwayFt: number
  fuelDelta: number
  competition: number
  congestion: number
  hubPotential: number
  weatherZone: string
  intl: boolean
  span: number
  hotHigh: boolean
  blurb: string
}

export const THEATERS = [
  'North America',
  'Mexico & Central America',
  'Caribbean',
  'South America',
  'Europe',
  'Middle East',
  'Africa',
  'Asia',
  'Oceania',
] as const

const BLURB: Record<string, string> = {
  AUS: 'A fast-growing Texas city airport. Strong local demand, rising competition, and room for a startup to rent gates.',
  DFW: 'A vast north Texas hub. Deep demand, high fees, and rivals who already own the local traveler.',
  IAH: 'Humid, international, and busy. Energy traffic keeps weekday yields honest.',
  DEN: 'High, windy, and huge. The field sits on the plains east of Denver, with room for winter weather to shut a bank.',
  ORD: 'One of the busiest fields in the country. Slots are scarce and delays are a business model.',
  JFK: 'Jamaica Bay on one side, Queens on the other. Prestige, high yields, and almost no spare slots.',
  LAX: 'Parallel runways against the Pacific. Transcontinental demand, congestion, and little room to be late.',
  ATL: 'Five east-west runways and a connecting machine in the middle. Frequency is rewarded. So is being on time.',
  SEA: 'Wedged between the city and the sound. Long stages, weather, and a useful later hub.',
  MEX: 'High altitude inside the city. Older aircraft give up range and payload here.',
  SFO: 'Runways pushed into the bay. Fog and a short field make the schedule less theoretical than it looks.',
  HNL: 'Reef runway and the island around it. Everything that is not local is a long overwater leg.',
  LHR: 'Two runways, a full sky, and a price for every slot. Heathrow does not expand because you need a gate.',
  DXB: 'A desert hub built for connections. The runway complex is the product.',
  SIN: 'Changi sits on reclaimed ground at the east end of Singapore. Long-haul demand, and almost no domestic substitute.',
  NRT: 'Narita is inland of the bay, with a long runway and a city that also has Haneda.',
  HND: 'Haneda is on the water south of Tokyo. Closer to the city, and harder to get into.',
}

const SPECIAL_SPAN: Record<string, number> = {
  DEN: 0.09, DFW: 0.07, ORD: 0.055, ATL: 0.05, IAH: 0.045, IAD: 0.05,
  DXB: 0.05, IST: 0.06, PVG: 0.05, PEK: 0.05, PKX: 0.055, CAN: 0.045,
  LAS: 0.045, MCO: 0.04, ANC: 0.04,
}

function autoSpan(id: string, size: Airport['size']): number {
  if (SPECIAL_SPAN[id]) return SPECIAL_SPAN[id]
  if (size === 'hub') return 0.04
  if (size === 'large') return 0.028
  if (size === 'medium') return 0.02
  return 0.015
}

/** id|icao|name|city|country|theater|lat|lon|size|demand|fee|slots|runway|fuel|competition|zone|intl|hot */
const RAW = `
ATL|KATL|Hartsfield-Jackson Atlanta International|Atlanta|United States|North America|33.6407|-84.4277|hub|100|1.22|6|12390|0.01|0.88|southeast|1|0
LAX|KLAX|Los Angeles International|Los Angeles|United States|North America|33.9416|-118.4085|hub|98|1.55|5|12091|0.06|0.9|pacific|1|0
ORD|KORD|Chicago O'Hare International|Chicago|United States|North America|41.9742|-87.9073|hub|99|1.48|5|13000|0.03|0.9|midwest|1|0
MDW|KMDW|Chicago Midway International|Chicago|United States|North America|41.7868|-87.7522|large|72|1.05|8|6522|0.02|0.7|midwest|0|0
DFW|KDFW|Dallas Fort Worth International|Dallas–Fort Worth|United States|North America|32.8998|-97.0403|hub|96|1.28|8|13401|0|0.84|texas|1|0
DAL|KDAL|Dallas Love Field|Dallas|United States|North America|32.8471|-96.8518|medium|64|0.98|10|8800|0.01|0.66|texas|0|0
DEN|KDEN|Denver International|Denver|United States|North America|39.8561|-104.6737|hub|90|1.16|7|16000|0.04|0.8|mountain|1|0
JFK|KJFK|John F. Kennedy International|New York|United States|North America|40.6413|-73.7781|hub|97|1.72|3|14511|0.08|0.93|northeast|1|0
LGA|KLGA|LaGuardia|New York|United States|North America|40.7769|-73.874|large|80|1.4|4|7003|0.06|0.86|northeast|0|0
EWR|KEWR|Newark Liberty International|Newark|United States|North America|40.6895|-74.1745|hub|88|1.45|5|11000|0.05|0.84|northeast|1|0
SFO|KSFO|San Francisco International|San Francisco|United States|North America|37.6213|-122.379|hub|91|1.5|4|11870|0.07|0.86|pacific|1|0
SEA|KSEA|Seattle-Tacoma International|Seattle|United States|North America|47.4502|-122.3088|large|84|1.2|6|11901|0.05|0.7|pacific|1|0
LAS|KLAS|Harry Reid International|Las Vegas|United States|North America|36.084|-115.1537|hub|86|1.18|8|14512|0.03|0.78|desert|1|0
MIA|KMIA|Miami International|Miami|United States|North America|25.7959|-80.287|hub|90|1.32|6|13016|0.02|0.8|southeast|1|0
MCO|KMCO|Orlando International|Orlando|United States|North America|28.4312|-81.3081|hub|84|1.1|8|12005|0.01|0.72|southeast|1|0
IAH|KIAH|George Bush Intercontinental|Houston|United States|North America|29.9902|-95.3368|hub|92|1.18|8|12001|0|0.78|texas|1|0
HOU|KHOU|William P. Hobby|Houston|United States|North America|29.6454|-95.2789|medium|66|0.96|12|7602|0.01|0.64|texas|1|0
BOS|KBOS|Boston Logan International|Boston|United States|North America|42.3656|-71.0096|large|86|1.38|5|10083|0.05|0.82|northeast|1|0
IAD|KIAD|Washington Dulles International|Washington|United States|North America|38.9531|-77.4565|hub|82|1.3|6|11500|0.03|0.74|northeast|1|0
DCA|KDCA|Ronald Reagan Washington National|Washington|United States|North America|38.8512|-77.0402|large|84|1.42|4|7169|0.04|0.88|northeast|0|0
BWI|KBWI|Baltimore/Washington International|Baltimore|United States|North America|39.1754|-76.6683|large|74|1.08|10|10502|0.02|0.66|northeast|1|0
PHX|KPHX|Phoenix Sky Harbor International|Phoenix|United States|North America|33.4373|-112.0078|hub|83|1.08|8|11489|0.02|0.7|desert|1|0
CLT|KCLT|Charlotte Douglas International|Charlotte|United States|North America|35.214|-80.9431|hub|80|1.12|7|10000|0.01|0.76|southeast|1|0
PHL|KPHL|Philadelphia International|Philadelphia|United States|North America|39.8729|-75.2437|large|78|1.2|6|10506|0.03|0.74|northeast|1|0
MSP|KMSP|Minneapolis-Saint Paul International|Minneapolis|United States|North America|44.8848|-93.2223|hub|79|1.14|7|11000|0.03|0.72|midwest|1|0
DTW|KDTW|Detroit Metropolitan|Detroit|United States|North America|42.2162|-83.3554|hub|78|1.12|7|12003|0.02|0.7|midwest|1|0
SLC|KSLC|Salt Lake City International|Salt Lake City|United States|North America|40.7899|-111.9791|large|74|1.06|9|12002|0.03|0.62|mountain|1|0
SAN|KSAN|San Diego International|San Diego|United States|North America|32.7338|-117.1933|large|76|1.22|6|9401|0.04|0.72|pacific|1|0
TPA|KTPA|Tampa International|Tampa|United States|North America|27.9755|-82.5332|large|72|1.02|10|11002|0.01|0.6|southeast|1|0
FLL|KFLL|Fort Lauderdale-Hollywood International|Fort Lauderdale|United States|North America|26.0726|-80.1527|large|74|1.04|9|9000|0.02|0.68|southeast|1|0
PDX|KPDX|Portland International|Portland|United States|North America|45.5898|-122.5951|large|70|1.06|10|11000|0.03|0.58|pacific|1|0
AUS|KAUS|Austin-Bergstrom International|Austin|United States|North America|30.1945|-97.6699|medium|74|1|16|12250|0.02|0.62|texas|1|0
BNA|KBNA|Nashville International|Nashville|United States|North America|36.1245|-86.6782|large|73|1.04|10|11030|0.01|0.64|southeast|1|0
MSY|KMSY|Louis Armstrong New Orleans International|New Orleans|United States|North America|29.9934|-90.258|medium|68|1.02|12|10104|0.01|0.58|southeast|1|0
RDU|KRDU|Raleigh-Durham International|Raleigh|United States|North America|35.8776|-78.7875|medium|66|0.98|12|10000|0.01|0.55|southeast|1|0
SJC|KSJC|San Jose Mineta International|San Jose|United States|North America|37.3626|-121.929|medium|70|1.16|8|11000|0.05|0.7|pacific|1|0
OAK|KOAK|Oakland International|Oakland|United States|North America|37.7213|-122.2208|medium|62|1.02|12|10000|0.03|0.58|pacific|1|0
SMF|KSMF|Sacramento International|Sacramento|United States|North America|38.6954|-121.5908|medium|58|0.94|14|8600|0.02|0.48|pacific|0|0
CLE|KCLE|Cleveland Hopkins International|Cleveland|United States|North America|41.4117|-81.8498|medium|60|0.96|14|9000|0.02|0.52|midwest|1|0
PIT|KPIT|Pittsburgh International|Pittsburgh|United States|North America|40.4915|-80.2329|medium|58|0.94|14|11500|0.02|0.46|northeast|1|0
CVG|KCVG|Cincinnati/Northern Kentucky International|Cincinnati|United States|North America|39.0488|-84.6678|medium|62|0.98|12|12000|0.01|0.5|midwest|1|0
CMH|KCMH|John Glenn Columbus International|Columbus|United States|North America|39.998|-82.8919|medium|58|0.94|14|10113|0.01|0.48|midwest|0|0
IND|KIND|Indianapolis International|Indianapolis|United States|North America|39.7173|-86.2944|medium|60|0.94|14|11200|0.01|0.48|midwest|1|0
MCI|KMCI|Kansas City International|Kansas City|United States|North America|39.2976|-94.7139|medium|62|0.96|14|10801|0.01|0.5|midwest|1|0
STL|KSTL|St. Louis Lambert International|St. Louis|United States|North America|38.7487|-90.37|medium|64|0.98|12|11019|0.01|0.52|midwest|1|0
MKE|KMKE|Milwaukee Mitchell International|Milwaukee|United States|North America|42.9472|-87.8966|medium|54|0.92|16|9690|0.02|0.44|midwest|0|0
JAX|KJAX|Jacksonville International|Jacksonville|United States|North America|30.4941|-81.6879|medium|56|0.92|16|10000|0.01|0.42|southeast|0|0
HNL|PHNL|Daniel K. Inouye International|Honolulu|United States|North America|21.3187|-157.9225|large|78|1.2|8|12312|0.12|0.6|hawaii|1|0
ANC|PANC|Ted Stevens Anchorage International|Anchorage|United States|North America|61.1743|-149.9962|medium|52|1.05|12|12400|0.1|0.4|alaska|1|0
ABQ|KABQ|Albuquerque International Sunport|Albuquerque|United States|North America|35.0402|-106.6092|medium|48|0.9|16|13793|0.03|0.36|desert|0|0
SAT|KSAT|San Antonio International|San Antonio|United States|North America|29.5337|-98.4698|medium|60|0.94|14|8505|0.01|0.48|texas|1|0
OGG|PHOG|Kahului Airport|Kahului|United States|North America|20.8986|-156.4305|medium|58|1.08|10|6998|0.1|0.5|hawaii|1|0
YYZ|CYYZ|Toronto Pearson International|Toronto|Canada|North America|43.6777|-79.6248|hub|90|1.34|6|11120|0.04|0.78|canada|1|0
YVR|CYVR|Vancouver International|Vancouver|Canada|North America|49.1947|-123.1792|large|80|1.22|7|11500|0.05|0.66|canada|1|0
YUL|CYUL|Montréal-Trudeau International|Montreal|Canada|North America|45.4706|-73.7408|large|76|1.16|8|11000|0.04|0.64|canada|1|0
YYC|CYYC|Calgary International|Calgary|Canada|North America|51.1215|-114.0076|large|70|1.08|9|14000|0.04|0.55|canada|1|0
YEG|CYEG|Edmonton International|Edmonton|Canada|North America|53.3097|-113.5792|medium|58|1|12|11000|0.04|0.42|canada|1|0
YOW|CYOW|Ottawa Macdonald-Cartier International|Ottawa|Canada|North America|45.3225|-75.6692|medium|60|1.02|12|10000|0.03|0.48|canada|1|0
YWG|CYWG|Winnipeg Richardson International|Winnipeg|Canada|North America|49.91|-97.2399|medium|48|0.96|14|11000|0.04|0.36|canada|0|0
YHZ|CYHZ|Halifax Stanfield International|Halifax|Canada|North America|44.8808|-63.5086|medium|50|0.98|14|10500|0.04|0.38|canada|1|0
YQB|CYQB|Québec City Jean Lesage International|Quebec City|Canada|North America|46.7911|-71.3933|regional|42|0.9|16|9000|0.03|0.3|canada|0|0
YYJ|CYYJ|Victoria International|Victoria|Canada|North America|48.6469|-123.4258|regional|40|0.92|16|7000|0.04|0.28|canada|0|0
MEX|MMMX|Mexico City International|Mexico City|Mexico|Mexico & Central America|19.4363|-99.0721|hub|88|1.12|4|12966|0.07|0.74|mexico|1|1
CUN|MMUN|Cancún International|Cancun|Mexico|Mexico & Central America|21.0365|-86.8771|large|82|1.08|8|11483|0.04|0.7|mexico|1|0
GDL|MMGL|Guadalajara International|Guadalajara|Mexico|Mexico & Central America|20.5218|-103.3112|large|74|1.02|9|13123|0.03|0.58|mexico|1|0
MTY|MMMY|Monterrey International|Monterrey|Mexico|Mexico & Central America|25.7785|-100.1069|large|72|1.02|9|9843|0.03|0.6|mexico|1|0
TIJ|MMTJ|Tijuana International|Tijuana|Mexico|Mexico & Central America|32.5411|-116.9702|medium|64|0.96|12|9700|0.03|0.55|mexico|1|0
PVR|MMPR|Licenciado Gustavo Díaz Ordaz International|Puerto Vallarta|Mexico|Mexico & Central America|20.6801|-105.2544|medium|66|1.02|10|10171|0.04|0.58|mexico|1|0
SJD|MMSD|Los Cabos International|San José del Cabo|Mexico|Mexico & Central America|23.1518|-109.7215|medium|68|1.06|10|9843|0.05|0.6|mexico|1|0
MID|MMMD|Mérida International|Merida|Mexico|Mexico & Central America|20.937|-89.6577|medium|52|0.94|14|10499|0.03|0.4|mexico|1|0
PTY|MPTO|Tocumen International|Panama City|Panama|Mexico & Central America|9.0714|-79.3835|hub|78|1.14|7|12000|0.05|0.66|central|1|0
SJO|MROC|Juan Santamaría International|San José|Costa Rica|Mexico & Central America|9.9939|-84.2088|medium|64|1.04|10|9882|0.05|0.52|central|1|0
GUA|MGGT|La Aurora International|Guatemala City|Guatemala|Mexico & Central America|14.5833|-90.5275|medium|58|1|12|9800|0.05|0.48|central|1|0
SAL|MSLP|El Salvador International|San Salvador|El Salvador|Mexico & Central America|13.4409|-89.0557|medium|56|0.98|12|10500|0.04|0.46|central|1|0
MGA|MNMG|Augusto C. Sandino International|Managua|Nicaragua|Mexico & Central America|12.1415|-86.1682|regional|46|0.94|14|8000|0.05|0.36|central|1|0
SJU|TJSJ|Luis Muñoz Marín International|San Juan|Puerto Rico|Caribbean|18.4394|-66.0018|large|70|1.08|9|10000|0.06|0.58|caribbean|1|0
PUJ|MDPC|Punta Cana International|Punta Cana|Dominican Republic|Caribbean|18.5674|-68.3634|large|76|1.06|8|10171|0.06|0.64|caribbean|1|0
SDQ|MDSD|Las Américas International|Santo Domingo|Dominican Republic|Caribbean|18.4297|-69.6689|medium|62|1|12|11000|0.05|0.5|caribbean|1|0
MBJ|MKJS|Sangster International|Montego Bay|Jamaica|Caribbean|18.5037|-77.9134|medium|68|1.04|10|8700|0.06|0.56|caribbean|1|0
HAV|MUHA|José Martí International|Havana|Cuba|Caribbean|22.9892|-82.4091|medium|60|1.02|10|13123|0.06|0.4|caribbean|1|0
NAS|MYNN|Lynden Pindling International|Nassau|Bahamas|Caribbean|25.039|-77.4662|medium|58|1.04|12|11353|0.06|0.48|caribbean|1|0
AUA|TNCA|Queen Beatrix International|Oranjestad|Aruba|Caribbean|12.5014|-70.0152|medium|60|1.06|10|9000|0.07|0.5|caribbean|1|0
BGI|TBPB|Grantley Adams International|Bridgetown|Barbados|Caribbean|13.0746|-59.4925|medium|54|1.04|12|11000|0.07|0.42|caribbean|1|0
POS|TTPP|Piarco International|Port of Spain|Trinidad and Tobago|Caribbean|10.5954|-61.3372|medium|52|1.02|12|10500|0.06|0.4|caribbean|1|0
SXM|TNCM|Princess Juliana International|Philipsburg|Sint Maarten|Caribbean|18.041|-63.1089|regional|56|1.08|10|7546|0.07|0.52|caribbean|1|0
GRU|SBGR|São Paulo/Guarulhos International|São Paulo|Brazil|South America|-23.4356|-46.4731|hub|92|1.24|6|12140|0.06|0.8|south-america|1|0
GIG|SBGL|Rio de Janeiro/Galeão International|Rio de Janeiro|Brazil|South America|-22.8099|-43.2506|large|78|1.12|8|13123|0.05|0.66|south-america|1|0
BSB|SBBR|Brasília International|Brasília|Brazil|South America|-15.8697|-47.9208|large|70|1.04|9|10827|0.04|0.55|south-america|1|0
CNF|SBCF|Belo Horizonte/Confins International|Belo Horizonte|Brazil|South America|-19.6244|-43.9719|medium|62|0.98|12|9843|0.04|0.48|south-america|1|0
EZE|SAEZ|Ministro Pistarini International|Buenos Aires|Argentina|South America|-34.8222|-58.5358|hub|80|1.14|7|10827|0.05|0.68|south-america|1|0
AEP|SABE|Aeroparque Jorge Newbery|Buenos Aires|Argentina|South America|-34.5592|-58.4156|large|72|1.1|6|6890|0.04|0.7|south-america|0|0
SCL|SCEL|Arturo Merino Benítez International|Santiago|Chile|South America|-33.393|-70.7858|hub|76|1.12|7|12467|0.05|0.64|south-america|1|0
LIM|SPJC|Jorge Chávez International|Lima|Peru|South America|-12.0219|-77.1143|hub|78|1.1|7|11506|0.05|0.66|south-america|1|0
BOG|SKBO|El Dorado International|Bogotá|Colombia|South America|4.7016|-74.1469|hub|82|1.12|6|12467|0.05|0.7|south-america|1|1
MDE|SKRG|José María Córdova International|Medellín|Colombia|South America|6.1645|-75.4231|medium|64|1.02|10|11483|0.04|0.52|south-america|1|1
UIO|SEQM|Mariscal Sucre International|Quito|Ecuador|South America|-0.1292|-78.3575|medium|60|1.04|10|13400|0.06|0.5|south-america|1|1
GYE|SEGU|José Joaquín de Olmedo International|Guayaquil|Ecuador|South America|-2.1574|-79.8836|medium|62|1|12|9177|0.05|0.48|south-america|1|0
CCS|SVMI|Simón Bolívar International|Caracas|Venezuela|South America|10.6031|-66.9906|medium|58|1.02|10|11483|0.06|0.44|south-america|1|0
MVD|SUMU|Carrasco International|Montevideo|Uruguay|South America|-34.8384|-56.0308|medium|52|0.98|12|10500|0.05|0.4|south-america|1|0
LPB|SLLP|El Alto International|La Paz|Bolivia|South America|-16.5133|-68.1923|medium|48|1|12|13123|0.08|0.36|south-america|1|1
CUZ|SPZO|Alejandro Velasco Astete International|Cusco|Peru|South America|-13.5357|-71.9388|regional|50|1.02|10|11100|0.06|0.42|south-america|1|1
LHR|EGLL|London Heathrow|London|United Kingdom|Europe|51.47|-0.4543|hub|99|1.85|3|12802|0.08|0.94|uk|1|0
LGW|EGKK|London Gatwick|London|United Kingdom|Europe|51.1537|-0.1821|large|80|1.28|6|10879|0.05|0.74|uk|1|0
MAN|EGCC|Manchester Airport|Manchester|United Kingdom|Europe|53.3537|-2.275|large|74|1.16|8|10000|0.04|0.62|uk|1|0
EDI|EGPH|Edinburgh Airport|Edinburgh|United Kingdom|Europe|55.95|-3.3725|medium|64|1.08|10|8386|0.04|0.52|uk|1|0
DUB|EIDW|Dublin Airport|Dublin|Ireland|Europe|53.4213|-6.2701|large|78|1.18|7|8652|0.05|0.66|uk|1|0
CDG|LFPG|Paris Charles de Gaulle|Paris|France|Europe|49.0097|2.5479|hub|96|1.55|4|13829|0.06|0.88|europe|1|0
ORY|LFPO|Paris Orly|Paris|France|Europe|48.7233|2.3794|large|78|1.28|6|11975|0.05|0.74|europe|1|0
NCE|LFMN|Nice Côte d'Azur Airport|Nice|France|Europe|43.6584|7.2159|medium|70|1.16|8|9711|0.05|0.6|europe|1|0
FRA|EDDF|Frankfurt Airport|Frankfurt|Germany|Europe|50.0379|8.5622|hub|95|1.5|4|13123|0.06|0.88|europe|1|0
MUC|EDDM|Munich Airport|Munich|Germany|Europe|48.3538|11.7861|hub|86|1.32|6|13123|0.05|0.74|europe|1|0
BER|EDDB|Berlin Brandenburg|Berlin|Germany|Europe|52.3667|13.5033|large|74|1.16|8|13123|0.04|0.6|europe|1|0
AMS|EHAM|Amsterdam Airport Schiphol|Amsterdam|Netherlands|Europe|52.3105|4.7683|hub|94|1.42|5|12467|0.06|0.84|europe|1|0
MAD|LEMD|Adolfo Suárez Madrid-Barajas|Madrid|Spain|Europe|40.4983|-3.5676|hub|88|1.28|6|13711|0.05|0.76|iberia|1|0
BCN|LEBL|Josep Tarradellas Barcelona-El Prat|Barcelona|Spain|Europe|41.2971|2.0785|large|84|1.24|7|10997|0.05|0.74|iberia|1|0
FCO|LIRF|Rome Fiumicino|Rome|Italy|Europe|41.8003|12.2389|hub|86|1.3|6|12795|0.05|0.76|italy|1|0
MXP|LIMC|Milan Malpensa|Milan|Italy|Europe|45.6306|8.7281|large|78|1.22|7|12861|0.05|0.68|italy|1|0
ZRH|LSZH|Zurich Airport|Zurich|Switzerland|Europe|47.4647|8.5492|large|80|1.4|6|12139|0.07|0.7|europe|1|0
GVA|LSGG|Geneva Airport|Geneva|Switzerland|Europe|46.2381|6.1089|medium|68|1.28|8|12795|0.06|0.58|europe|1|0
VIE|LOWW|Vienna International|Vienna|Austria|Europe|48.1103|16.5697|large|76|1.2|8|11811|0.05|0.64|europe|1|0
LIS|LPPT|Humberto Delgado Airport|Lisbon|Portugal|Europe|38.7742|-9.1342|large|76|1.16|8|12484|0.05|0.66|iberia|1|0
ATH|LGAV|Athens International|Athens|Greece|Europe|37.9364|23.9445|large|74|1.12|8|13123|0.05|0.62|europe|1|0
IST|LTFM|Istanbul Airport|Istanbul|Turkey|Europe|41.2753|28.7519|hub|94|1.22|6|13451|0.06|0.8|turkey|1|0
CPH|EKCH|Copenhagen Airport|Copenhagen|Denmark|Europe|55.618|12.656|large|74|1.2|8|11811|0.05|0.62|nordic|1|0
OSL|ENGM|Oslo Gardermoen|Oslo|Norway|Europe|60.1939|11.1004|medium|66|1.14|9|11811|0.05|0.52|nordic|1|0
ARN|ESSA|Stockholm Arlanda|Stockholm|Sweden|Europe|59.6519|17.9186|large|70|1.14|8|10830|0.05|0.55|nordic|1|0
HEL|EFHK|Helsinki Airport|Helsinki|Finland|Europe|60.3172|24.9633|medium|64|1.12|9|11286|0.05|0.5|nordic|1|0
BRU|EBBR|Brussels Airport|Brussels|Belgium|Europe|50.9014|4.4844|large|72|1.18|8|11936|0.05|0.6|europe|1|0
DUS|EDDL|Düsseldorf Airport|Düsseldorf|Germany|Europe|51.2895|6.7668|large|70|1.16|8|9842|0.04|0.58|europe|1|0
AGP|LEMG|Málaga Airport|Málaga|Spain|Europe|36.6749|-4.4991|medium|68|1.08|10|10500|0.04|0.58|iberia|1|0
DXB|OMDB|Dubai International|Dubai|United Arab Emirates|Middle East|25.2532|55.3657|hub|98|1.35|5|13123|0.04|0.86|gulf|1|0
AUH|OMAA|Zayed International|Abu Dhabi|United Arab Emirates|Middle East|24.433|54.6511|hub|84|1.22|7|13452|0.04|0.7|gulf|1|0
DOH|OTHH|Hamad International|Doha|Qatar|Middle East|25.2731|51.608|hub|90|1.28|6|15912|0.04|0.78|gulf|1|0
JED|OEJN|King Abdulaziz International|Jeddah|Saudi Arabia|Middle East|21.6796|39.1565|hub|82|1.16|7|13123|0.05|0.68|gulf|1|0
RUH|OERK|King Khalid International|Riyadh|Saudi Arabia|Middle East|24.9576|46.6988|large|76|1.12|8|13796|0.04|0.62|gulf|1|0
CAI|HECA|Cairo International|Cairo|Egypt|Middle East|30.1219|31.4056|hub|80|1.1|7|13123|0.05|0.66|north-africa|1|0
TLV|LLBG|Ben Gurion Airport|Tel Aviv|Israel|Middle East|32.0114|34.8867|large|74|1.24|6|12915|0.06|0.64|levant|1|0
AMM|OJAI|Queen Alia International|Amman|Jordan|Middle East|31.7226|35.9932|medium|58|1.04|10|12008|0.05|0.46|levant|1|0
JNB|FAOR|O. R. Tambo International|Johannesburg|South Africa|Africa|-26.1392|28.246|hub|82|1.16|7|14495|0.06|0.7|southern-africa|1|0
CPT|FACT|Cape Town International|Cape Town|South Africa|Africa|-33.9648|18.6017|large|74|1.1|8|10502|0.06|0.6|southern-africa|1|0
NBO|HKJK|Jomo Kenyatta International|Nairobi|Kenya|Africa|-1.3192|36.9278|large|70|1.08|8|13507|0.07|0.58|east-africa|1|0
ADD|HAAB|Addis Ababa Bole International|Addis Ababa|Ethiopia|Africa|8.9779|38.7993|hub|76|1.1|7|12467|0.07|0.64|east-africa|1|1
LOS|DNMM|Murtala Muhammed International|Lagos|Nigeria|Africa|6.5774|3.3212|large|74|1.14|7|12795|0.07|0.66|west-africa|1|0
CMN|GMMN|Mohammed V International|Casablanca|Morocco|Africa|33.3675|-7.59|large|70|1.08|8|12205|0.05|0.58|north-africa|1|0
ACC|DGAA|Kotoka International|Accra|Ghana|Africa|5.6052|-0.1668|medium|58|1.04|10|11165|0.06|0.48|west-africa|1|0
RAK|GMMX|Marrakesh Menara Airport|Marrakesh|Morocco|Africa|31.6069|-8.0363|medium|60|1.02|10|10171|0.05|0.5|north-africa|1|0
NRT|RJAA|Narita International|Tokyo|Japan|Asia|35.772|140.3929|hub|90|1.48|4|13123|0.08|0.82|japan|1|0
HND|RJTT|Tokyo Haneda|Tokyo|Japan|Asia|35.5494|139.7798|hub|94|1.55|3|11024|0.08|0.88|japan|1|0
KIX|RJBB|Kansai International|Osaka|Japan|Asia|34.4347|135.244|large|78|1.28|7|13123|0.07|0.66|japan|1|0
ICN|RKSI|Incheon International|Seoul|South Korea|Asia|37.4602|126.4407|hub|92|1.36|5|13123|0.06|0.8|korea|1|0
GMP|RKSS|Gimpo International|Seoul|South Korea|Asia|37.5583|126.7906|large|74|1.18|6|11811|0.05|0.7|korea|0|0
PEK|ZBAA|Beijing Capital International|Beijing|China|Asia|40.0799|116.6031|hub|93|1.3|5|12467|0.05|0.82|china|1|0
PKX|ZBAD|Beijing Daxing International|Beijing|China|Asia|39.5098|116.4108|hub|88|1.22|6|12467|0.04|0.74|china|1|0
PVG|ZSPD|Shanghai Pudong International|Shanghai|China|Asia|31.1443|121.8083|hub|94|1.32|5|13123|0.05|0.84|china|1|0
SHA|ZSSS|Shanghai Hongqiao International|Shanghai|China|Asia|31.1979|121.3363|large|78|1.2|6|11155|0.04|0.74|china|0|0
CAN|ZGGG|Guangzhou Baiyun International|Guangzhou|China|Asia|23.3924|113.2988|hub|88|1.2|6|12467|0.04|0.76|china|1|0
HKG|VHHH|Hong Kong International|Hong Kong|Hong Kong|Asia|22.3089|113.9146|hub|92|1.5|4|12467|0.07|0.86|china|1|0
TPE|RCTP|Taiwan Taoyuan International|Taipei|Taiwan|Asia|25.0797|121.2342|hub|86|1.28|6|12008|0.06|0.74|china|1|0
SIN|WSSS|Singapore Changi|Singapore|Singapore|Asia|1.3644|103.9915|hub|96|1.4|5|13123|0.06|0.84|southeast-asia|1|0
BKK|VTBS|Suvarnabhumi Airport|Bangkok|Thailand|Asia|13.69|100.7501|hub|90|1.18|6|13123|0.05|0.76|southeast-asia|1|0
KUL|WMKK|Kuala Lumpur International|Kuala Lumpur|Malaysia|Asia|2.7456|101.7099|hub|84|1.14|7|13123|0.05|0.7|southeast-asia|1|0
CGK|WIII|Soekarno-Hatta International|Jakarta|Indonesia|Asia|-6.1256|106.6559|hub|86|1.12|6|12008|0.05|0.74|southeast-asia|1|0
DPS|WADD|Ngurah Rai International|Denpasar|Indonesia|Asia|-8.7482|115.1672|large|76|1.1|8|9843|0.06|0.66|southeast-asia|1|0
MNL|RPLL|Ninoy Aquino International|Manila|Philippines|Asia|14.5086|121.0198|large|78|1.14|7|12261|0.05|0.72|southeast-asia|1|0
DEL|VIDP|Indira Gandhi International|Delhi|India|Asia|28.5562|77.1|hub|90|1.16|6|14534|0.05|0.78|india|1|0
BOM|VABB|Chhatrapati Shivaji Maharaj International|Mumbai|India|Asia|19.0896|72.8656|hub|88|1.2|5|11302|0.05|0.8|india|1|0
BLR|VOBL|Kempegowda International|Bengaluru|India|Asia|13.1986|77.7066|large|76|1.1|8|13123|0.04|0.66|india|1|0
MAA|VOMM|Chennai International|Chennai|India|Asia|12.9941|80.1709|large|72|1.06|8|12008|0.04|0.62|india|1|0
HYD|VOHS|Rajiv Gandhi International|Hyderabad|India|Asia|17.2403|78.4294|large|74|1.06|8|13976|0.04|0.6|india|1|0
SYD|YSSY|Sydney Kingsford Smith|Sydney|Australia|Oceania|-33.9461|151.1772|hub|86|1.28|6|12997|0.06|0.74|oceania|1|0
MEL|YMML|Melbourne Airport|Melbourne|Australia|Oceania|-37.669|144.841|hub|80|1.18|7|11998|0.05|0.66|oceania|1|0
BNE|YBBN|Brisbane Airport|Brisbane|Australia|Oceania|-27.3842|153.1175|large|72|1.1|8|11680|0.05|0.58|oceania|1|0
PER|YPPH|Perth Airport|Perth|Australia|Oceania|-31.9403|115.967|large|68|1.12|8|11300|0.08|0.52|oceania|1|0
AKL|NZAA|Auckland Airport|Auckland|New Zealand|Oceania|-37.0082|174.785|large|74|1.16|8|11926|0.07|0.6|oceania|1|0
WLG|NZWN|Wellington Airport|Wellington|New Zealand|Oceania|-41.3272|174.8053|medium|52|1.08|10|6841|0.06|0.48|oceania|0|0
CHC|NZCH|Christchurch Airport|Christchurch|New Zealand|Oceania|-43.4894|172.5322|medium|56|1.04|12|10787|0.05|0.44|oceania|1|0
NAN|NFFN|Nadi International|Nadi|Fiji|Oceania|-17.7554|177.4434|regional|48|1.1|12|10700|0.1|0.36|oceania|1|0
`.trim()

function parse(line: string): Airport {
  const p = line.split('|')
  if (p.length < 18) throw new Error(`Bad airport row: ${line}`)
  const size = p[8] as Airport['size']
  const demand = Number(p[9])
  const id = p[0]
  const tourismBias = p[16] === '1' ? 0.72 : 0.4
  const hubBias = size === 'hub' ? 0.9 : size === 'large' ? 0.7 : size === 'medium' ? 0.48 : 0.28
  return {
    id,
    icao: p[1],
    name: p[2],
    city: p[3],
    country: p[4],
    theater: p[5],
    lat: Number(p[6]),
    lon: Number(p[7]),
    size,
    demand,
    business: Math.round(demand * (size === 'hub' || size === 'large' ? 0.82 : 0.55)),
    tourism: Math.round(demand * tourismBias),
    cargo: Math.round(demand * (size === 'hub' ? 0.78 : 0.4)),
    feeIndex: Number(p[10]),
    playerSlots: Number(p[11]),
    runwayFt: Number(p[12]),
    fuelDelta: Number(p[13]),
    competition: Number(p[14]),
    congestion: Number(p[14]),
    hubPotential: Math.round(demand * hubBias),
    weatherZone: p[15],
    intl: p[16] === '1',
    hotHigh: p[17] === '1',
    span: autoSpan(id, size),
    region: p[5],
    blurb: BLURB[id] ?? `${p[3]}. ${p[2]} (${p[1]}). ${Number(p[11]) <= 5 ? 'Slots are scarce.' : Number(p[11]) <= 8 ? 'Gates are limited.' : 'A new airline can still find room.'}`,
  }
}

export const AIRPORTS: Airport[] = RAW.split('\n').filter(Boolean).map(parse)

const INDEX = new Map<string, Airport>()
for (const airport of AIRPORTS) {
  if (INDEX.has(airport.id)) throw new Error(`Duplicate airport ${airport.id}`)
  if (!Number.isFinite(airport.lat) || !Number.isFinite(airport.lon)) throw new Error(`Bad coordinates ${airport.id}`)
  INDEX.set(airport.id, airport)
}

export function getAirport(id: string): Airport {
  const airport = INDEX.get(id)
  if (!airport) throw new Error(`Unknown airport ${id}`)
  return airport
}

export function viewZoom(airport: Airport, level: 'city' | 'airport' | 'ops'): number {
  const base = airport.span >= 0.08 ? 12 : airport.span >= 0.05 ? 13 : 14
  if (level === 'city') return base - 2
  if (level === 'ops') return Math.min(17, base + 2)
  return base
}

function satelliteUrl(lat: number, lon: number, span: number, width: number, height: number): string {
  const latSpan = span
  const lonSpan = span / Math.max(0.25, Math.cos((lat * Math.PI) / 180))
  const bbox = [lon - lonSpan, lat - latSpan, lon + lonSpan, lat + latSpan].map((n) => n.toFixed(5)).join(',')
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=jpg&f=image`
}

/** Real Esri World Imagery centered on the airport. Not a generated picture of an airport. */
export function airportImage(id: string, kind: 'aerial' | 'terminal' | 'wide' = 'aerial'): string {
  const airport = getAirport(id)
  const span = kind === 'aerial' ? airport.span : airport.span * 2.6
  return satelliteUrl(airport.lat, airport.lon, span, kind === 'aerial' ? 640 : 480, 360)
}

export function airportThumb(id: string): string {
  const airport = getAirport(id)
  return satelliteUrl(airport.lat, airport.lon, airport.span, 320, 180)
}

export const SCENE = {
  gate: '/assets/scenes/gate.jpg',
  runway: '/assets/scenes/runway.jpg',
  apron: '/assets/scenes/apron.jpg',
  hangar: '/assets/scenes/hangar.jpg',
  night: '/assets/scenes/night.jpg',
  rain: '/assets/scenes/rain.jpg',
  snow: '/assets/scenes/snow.jpg',
  construction: '/assets/scenes/construction.jpg',
  regional: '/assets/scenes/regional.jpg',
  fuel: '/assets/scenes/fuel.jpg',
  merger: '/assets/scenes/merger.jpg',
  accident: '/assets/scenes/accident.jpg',
  boom: '/assets/scenes/boom.jpg',
  recession: '/assets/scenes/recession.jpg',
  strike: '/assets/scenes/strike.jpg',
  news: '/assets/scenes/newsroom.jpg',
}

/** One-way daily market size before competition. Other pairs use the distance formula. */
export const PAIR_DEMAND: Record<string, number> = {
  'AUS-DFW': 560,
  'AUS-IAH': 470,
  'AUS-DEN': 340,
  'AUS-ORD': 280,
  'AUS-JFK': 300,
  'AUS-LAX': 320,
  'AUS-ATL': 290,
  'AUS-SEA': 170,
  'AUS-MEX': 240,
  'ATL-DFW': 620,
  'ATL-IAH': 480,
  'ATL-DEN': 410,
  'ATL-JFK': 640,
  'ATL-LAX': 520,
  'ATL-MEX': 260,
  'ATL-ORD': 700,
  'ATL-SEA': 240,
  'DEN-DFW': 520,
  'DEN-IAH': 390,
  'DEN-JFK': 460,
  'DEN-LAX': 540,
  'DEN-MEX': 180,
  'DEN-ORD': 610,
  'DEN-SEA': 380,
  'DFW-IAH': 680,
  'DFW-JFK': 430,
  'DFW-LAX': 510,
  'DFW-MEX': 360,
  'DFW-ORD': 490,
  'DFW-SEA': 260,
  'IAH-JFK': 300,
  'IAH-LAX': 340,
  'IAH-MEX': 420,
  'IAH-ORD': 310,
  'IAH-SEA': 180,
  'JFK-LAX': 980,
  'JFK-MEX': 390,
  'JFK-ORD': 860,
  'JFK-SEA': 420,
  'LAX-MEX': 460,
  'LAX-ORD': 640,
  'LAX-SEA': 720,
  'MEX-ORD': 160,
  'ORD-SEA': 300,
}
