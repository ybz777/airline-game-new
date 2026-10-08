import type { AircraftEra, AircraftType } from '../types'

function craft(
  id: string, manufacturer: string, model: string, family: string,
  category: AircraftType['category'], era: AircraftEra, year: number, start: number, end: number | null,
  seats: number, cargo: number, range: number, speed: number, burn: number, fuel: number,
  price: number, lease: number, maint: number, check: number,
  reliability: number, appeal: number, noise: number, crew: number, engines: number, runway: number, age: number,
  visual: string,
): AircraftType {
  const isWide = category === 'widebody'
  const isTurbo = category === 'turboprop'
  const isReg = category === 'regional'
  const gate: AircraftType['gateSizeRequired'] = isWide ? (seats >= 450 ? 'Super' : 'Heavy') : (isTurbo || isReg ? 'Small' : 'Medium')
  const icaoCat: AircraftType['icaoCategory'] = isWide ? (seats >= 450 ? 'F' : 'E') : (category === 'narrowbody' ? 'C' : 'B')
  const layout = isWide ? (seats > 340 ? '3-4-3' : seats > 280 ? '3-3-3' : '2-4-2') : (isTurbo || isReg ? '2-2' : '3-3')
  return {
    id, manufacturer, model, variant: model, family, category, era,
    productionYear: year, productionStart: start, productionEnd: end,
    firstFlightYear: start,
    seatCapacity: seats, maxSeatCapacity: Math.round(seats * 1.15), cargoTons: cargo,
    rangeNm: range, publishedRangeNm: range, practicalRangeNm: Math.round(range * 0.85),
    mtowLbs: Math.round(seats * 980 + cargo * 3500 + 38000),
    cruiseSpeedKt: speed,
    fuelCapacityGal: Math.round(burn * (range / speed + 1.5)),
    fuelBurnGph: burn, fuelIndex: fuel,
    purchasePrice: price, leaseMonthly: lease, maintenancePerFlight: maint, checkCost: check,
    costPerBlockHour: Math.round(burn * 3.4 + maint * 0.65 + 850),
    reliability, passengerAppeal: appeal, noise, crewPayMonthly: crew, engines,
    engineType: isTurbo ? 'Turboprop' : `${engines}x Turbofan`,
    fuselageType: isWide ? (seats >= 500 ? 'double-deck-twin-aisle' : 'twin-aisle') : 'single-aisle',
    seatingLayout: layout,
    icaoCode: id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4),
    icaoCategory: icaoCat,
    gateSizeRequired: gate,
    minRunwayFt: runway,
    typicalAskAge: age, illustrated: false, visual,
  }
}

/** Catalog types without a matching exterior yet. They are not offered for sale. */
export const EXTRA_AIRCRAFT: AircraftType[] = [
  craft('atr42', 'ATR', 'ATR 42-600', 'atr', 'turboprop', 'modern', 2014, 1984, null, 48, 0.8, 720, 260, 140, 0.7, 4_200_000, 38_000, 420, 110_000, 84, 58, 66, 5800, 2, 3600, 12, 'atr'),
  craft('dh8-400', 'De Havilland', 'Dash 8 Q400', 'dash8', 'turboprop', 'modern', 2010, 1999, 2021, 78, 1.6, 1100, 360, 280, 0.78, 7_800_000, 64_000, 620, 160_000, 82, 62, 60, 6800, 2, 4600, 14, 'atr'),
  craft('saab340', 'Saab', '340B', 'saab', 'turboprop', 'aging', 1994, 1984, 1999, 34, 0.5, 730, 250, 120, 0.9, 750_000, 14_000, 380, 90_000, 70, 42, 70, 5200, 2, 4200, 30, 'atr'),
  craft('e170', 'Embraer', 'E170', 'ejet', 'regional', 'modern', 2008, 2004, null, 72, 1, 1800, 430, 400, 0.86, 8_400_000, 72_000, 780, 190_000, 88, 74, 38, 8200, 2, 5300, 16, 'e175'),
  craft('e195', 'Embraer', 'E195', 'ejet', 'regional', 'modern', 2011, 2006, null, 118, 1.8, 2300, 445, 560, 0.9, 15_500_000, 118_000, 1040, 250_000, 88, 76, 38, 9400, 2, 6800, 13, 'e175'),
  craft('crj700', 'Bombardier', 'CRJ-700', 'crj', 'regional', 'modern', 2006, 2001, null, 70, 1, 1700, 430, 440, 1.02, 6_800_000, 62_000, 980, 180_000, 82, 60, 46, 7800, 2, 5300, 18, 'crj'),
  craft('fokker100', 'Fokker', '100', 'fokker', 'narrowbody', 'aging', 1993, 1988, 1997, 109, 1.6, 1700, 430, 720, 1.32, 1_400_000, 24_000, 1600, 240_000, 68, 50, 64, 7800, 2, 5900, 31, 'classic737'),
  craft('bae146', 'British Aerospace', '146-200', 'bae146', 'regional', 'classic', 1988, 1983, 2001, 100, 1.4, 1400, 400, 780, 1.45, 900_000, 18_000, 1700, 220_000, 62, 46, 58, 7400, 4, 4500, 36, 'crj'),
  craft('b737-700', 'Boeing', '737-700', '737ng', 'narrowbody', 'modern', 2004, 1998, 2019, 143, 2.2, 3400, 453, 680, 0.94, 9_600_000, 128_000, 1380, 390_000, 88, 78, 42, 10400, 2, 7000, 20, 'ng737'),
  craft('b737-900', 'Boeing', '737-900ER', '737ng', 'narrowbody', 'modern', 2012, 2007, 2019, 178, 2.8, 3200, 453, 760, 0.98, 14_200_000, 168_000, 1500, 420_000, 87, 80, 42, 11200, 2, 7900, 12, 'ng737'),
  craft('a321', 'Airbus', 'A321-200', 'a320ceo', 'narrowbody', 'modern', 2008, 1994, 2021, 185, 2.8, 3200, 450, 780, 0.98, 16_000_000, 175_000, 1480, 400_000, 88, 82, 40, 11400, 2, 7500, 16, 'a320'),
  craft('a320neo', 'Airbus', 'A320neo', 'a320neo', 'narrowbody', 'current', 2019, 2016, null, 165, 2.6, 3500, 450, 600, 0.72, 38_000_000, 310_000, 1120, 400_000, 94, 90, 28, 12200, 2, 7200, 5, 'a321neo'),
  craft('a330-900', 'Airbus', 'A330-900', 'a330neo', 'widebody', 'current', 2020, 2018, null, 287, 12, 7200, 470, 1500, 0.82, 68_000_000, 540_000, 3000, 1_050_000, 94, 94, 26, 16400, 2, 9000, 4, 'a330'),
  craft('b777-300er', 'Boeing', '777-300ER', '777', 'widebody', 'modern', 2011, 2004, null, 365, 18, 7370, 490, 2200, 1.08, 42_000_000, 360_000, 4200, 1_250_000, 91, 90, 40, 17600, 2, 10000, 13, 'widemodern'),
  craft('b767-300f', 'Boeing', '767-300F', '767', 'widebody', 'mature', 2002, 1995, null, 0, 52, 3255, 460, 1500, 1.18, 18_000_000, 190_000, 2800, 720_000, 84, 20, 52, 14800, 2, 8000, 22, 'wideclassic'),
  craft('b777f', 'Boeing', '777F', '777', 'widebody', 'current', 2016, 2009, null, 0, 102, 4970, 490, 2100, 1.02, 58_000_000, 480_000, 3600, 1_200_000, 93, 20, 36, 17200, 2, 9800, 8, 'widemodern'),
  craft('md-90', 'McDonnell Douglas', 'MD-90', 'md80', 'narrowbody', 'aging', 1997, 1995, 2000, 153, 2.2, 2400, 438, 860, 1.22, 2_100_000, 32_000, 2100, 330_000, 74, 56, 58, 8800, 2, 6800, 27, 'md80'),
  craft('a300', 'Airbus', 'A300-600', 'a300', 'widebody', 'aging', 1992, 1984, 2007, 266, 15, 4050, 470, 1900, 1.4, 3_200_000, 48_000, 3800, 820_000, 72, 58, 64, 14600, 2, 7600, 32, 'wideclassic'),
  craft('a340-300', 'Airbus', 'A340-300', 'a340', 'widebody', 'mature', 1998, 1993, 2011, 295, 14, 7300, 470, 2100, 1.38, 9_500_000, 120_000, 4200, 1_050_000, 80, 74, 58, 16800, 4, 9800, 26, 'a330'),
  craft('a220-300', 'Airbus', 'A220-300', 'a220', 'narrowbody', 'current', 2020, 2016, null, 140, 2, 3400, 447, 520, 0.7, 28_000_000, 240_000, 980, 280_000, 94, 90, 26, 9800, 2, 5500, 4, 'a320'),
  craft('b747-8', 'Boeing', '747-8', '747', 'widebody', 'current', 2014, 2012, 2023, 410, 20, 7730, 490, 2800, 1.15, 48_000_000, 420_000, 6200, 1_700_000, 90, 86, 36, 18600, 4, 10200, 10, 'wideclassic'),
  craft('ssj100', 'Sukhoi', 'Superjet 100', 'ssj', 'regional', 'modern', 2016, 2011, null, 98, 1.2, 1600, 440, 520, 0.95, 7_200_000, 70_000, 1100, 210_000, 74, 62, 44, 8000, 2, 5800, 8, 'e175'),
  craft('b737-400', 'Boeing', '737-400', '737classic', 'narrowbody', 'aging', 1994, 1988, 2000, 146, 2.2, 2200, 440, 860, 1.32, 1_900_000, 30_000, 2000, 350_000, 74, 56, 64, 8600, 2, 6800, 30, 'classic737'),
  craft('b737-500', 'Boeing', '737-500', '737classic', 'narrowbody', 'aging', 1995, 1990, 1999, 108, 1.6, 2400, 440, 760, 1.26, 1_700_000, 28_000, 1800, 320_000, 75, 54, 62, 8200, 2, 5600, 29, 'classic737'),
  craft('b737-600', 'Boeing', '737-600', '737ng', 'narrowbody', 'modern', 2002, 1998, 2006, 110, 1.6, 3200, 453, 640, 0.98, 6_400_000, 84_000, 1320, 360_000, 86, 72, 42, 9800, 2, 6200, 22, 'ng737'),
  craft('b757-300', 'Boeing', '757-300', '757', 'narrowbody', 'mature', 2001, 1999, 2004, 243, 5, 3400, 461, 1240, 1.22, 6_800_000, 86_000, 2600, 560_000, 78, 68, 60, 11800, 2, 7800, 23, 'b757'),
  craft('b767-200', 'Boeing', '767-200ER', '767', 'widebody', 'aging', 1988, 1984, 1994, 214, 6, 6600, 470, 1550, 1.35, 3_400_000, 52_000, 3100, 680_000, 74, 62, 62, 13600, 2, 7600, 36, 'wideclassic'),
  craft('b767-400', 'Boeing', '767-400ER', '767', 'widebody', 'mature', 2002, 2000, 2014, 245, 8, 5625, 470, 1700, 1.2, 9_800_000, 120_000, 3600, 820_000, 82, 74, 54, 15000, 2, 8800, 22, 'wideclassic'),
  craft('b777-200a', 'Boeing', '777-200', '777', 'widebody', 'mature', 1996, 1995, 1997, 305, 12, 5200, 490, 1900, 1.12, 8_500_000, 110_000, 3800, 1_000_000, 84, 78, 46, 15800, 2, 8600, 28, 'widemodern'),
  craft('b777-300', 'Boeing', '777-300', '777', 'widebody', 'mature', 1999, 1998, 2006, 368, 16, 6000, 490, 2300, 1.2, 12_000_000, 150_000, 4400, 1_150_000, 84, 80, 46, 17200, 2, 10200, 25, 'widemodern'),
  craft('b787-8', 'Boeing', '787-8', '787', 'widebody', 'current', 2014, 2011, null, 242, 12, 7355, 488, 1380, 0.78, 48_000_000, 410_000, 2500, 1_050_000, 92, 92, 24, 16400, 2, 8600, 10, 'widemodern'),
  craft('b787-10', 'Boeing', '787-10', '787', 'widebody', 'current', 2019, 2018, null, 330, 15, 6430, 488, 1620, 0.8, 78_000_000, 620_000, 2900, 1_200_000, 93, 94, 24, 17600, 2, 9800, 5, 'widemodern'),
  craft('a330-200', 'Airbus', 'A330-200', 'a330', 'widebody', 'modern', 2004, 1998, null, 247, 10, 7250, 470, 1650, 1.04, 16_000_000, 180_000, 3400, 880_000, 88, 82, 40, 15200, 2, 8400, 20, 'a330'),
  craft('a340-600', 'Airbus', 'A340-600', 'a340', 'widebody', 'mature', 2004, 2002, 2011, 320, 16, 7800, 470, 2400, 1.45, 11_000_000, 140_000, 4800, 1_200_000, 78, 76, 60, 17600, 4, 10400, 20, 'a330'),
  craft('a350-1000', 'Airbus', 'A350-1000', 'a350', 'widebody', 'current', 2019, 2018, null, 369, 18, 8700, 488, 1680, 0.8, 92_000_000, 720_000, 3000, 1_280_000, 95, 96, 24, 18000, 2, 9500, 5, 'a330'),
  craft('b747-200', 'Boeing', '747-200', '747', 'widebody', 'classic', 1979, 1971, 1991, 366, 16, 6500, 490, 3600, 1.9, 1_200_000, 36_000, 7800, 1_500_000, 58, 48, 84, 17600, 4, 10500, 45, 'wideclassic'),
  craft('md-83', 'McDonnell Douglas', 'MD-83', 'md80', 'narrowbody', 'aging', 1992, 1985, 1999, 155, 2.2, 2500, 439, 1000, 1.58, 1_350_000, 24_000, 2600, 320_000, 66, 48, 74, 8400, 2, 7000, 32, 'md80'),
  craft('md-88', 'McDonnell Douglas', 'MD-88', 'md80', 'narrowbody', 'aging', 1991, 1987, 1993, 149, 2.1, 2000, 439, 980, 1.55, 1_250_000, 22_000, 2500, 310_000, 66, 48, 74, 8200, 2, 6400, 33, 'md80'),
  craft('crj1000', 'Bombardier', 'CRJ-1000', 'crj', 'regional', 'modern', 2012, 2010, null, 100, 1.4, 1650, 430, 520, 1.0, 11_000_000, 96_000, 1150, 230_000, 84, 68, 44, 8800, 2, 6800, 12, 'crj'),
  craft('erj145', 'Embraer', 'ERJ-145', 'erj', 'regional', 'aging', 2001, 1996, 2020, 50, 0.6, 1550, 430, 340, 1.2, 1_400_000, 22_000, 860, 140_000, 74, 46, 56, 6800, 2, 5200, 23, 'crj'),
  craft('dh8-300', 'De Havilland', 'Dash 8-300', 'dash8', 'turboprop', 'aging', 1996, 1989, 2009, 50, 1, 900, 280, 220, 0.86, 2_200_000, 28_000, 480, 120_000, 76, 52, 66, 6000, 2, 3800, 28, 'atr'),
]
