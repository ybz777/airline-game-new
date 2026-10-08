/** Fictional airline pilots. Portrait, name, gender, and age are stored together and never inferred from the image. */
export interface PilotIdentity {
  id: string
  name: string
  gender: 'Female' | 'Male'
  age: number
  thumb: string
  portrait: string
}

export const PILOT_ROSTER: PilotIdentity[] = [
  {
    "id": "p001",
    "name": "Andre Voss",
    "gender": "Male",
    "age": 28,
    "thumb": "/assets/pilots/thumb/p001.webp",
    "portrait": "/assets/pilots/full/p001.webp"
  },
  {
    "id": "p002",
    "name": "Maya Ellison",
    "gender": "Female",
    "age": 34,
    "thumb": "/assets/pilots/thumb/p002.webp",
    "portrait": "/assets/pilots/full/p002.webp"
  },
  {
    "id": "p003",
    "name": "Luis Ortega",
    "gender": "Male",
    "age": 56,
    "thumb": "/assets/pilots/thumb/p003.webp",
    "portrait": "/assets/pilots/full/p003.webp"
  },
  {
    "id": "p004",
    "name": "Priya Raman",
    "gender": "Female",
    "age": 31,
    "thumb": "/assets/pilots/thumb/p004.webp",
    "portrait": "/assets/pilots/full/p004.webp"
  },
  {
    "id": "p005",
    "name": "Marcus Hale",
    "gender": "Male",
    "age": 42,
    "thumb": "/assets/pilots/thumb/p005.webp",
    "portrait": "/assets/pilots/full/p005.webp"
  },
  {
    "id": "p006",
    "name": "Hannah Cho",
    "gender": "Female",
    "age": 36,
    "thumb": "/assets/pilots/thumb/p006.webp",
    "portrait": "/assets/pilots/full/p006.webp"
  },
  {
    "id": "p007",
    "name": "Jonah Krieger",
    "gender": "Male",
    "age": 38,
    "thumb": "/assets/pilots/thumb/p007.webp",
    "portrait": "/assets/pilots/full/p007.webp"
  },
  {
    "id": "p008",
    "name": "Chris Pell",
    "gender": "Male",
    "age": 67,
    "thumb": "/assets/pilots/thumb/p008.webp",
    "portrait": "/assets/pilots/full/p008.webp"
  },
  {
    "id": "p009",
    "name": "Elena Vasquez",
    "gender": "Female",
    "age": 48,
    "thumb": "/assets/pilots/thumb/p009.webp",
    "portrait": "/assets/pilots/full/p009.webp"
  },
  {
    "id": "p010",
    "name": "Evan Brooks",
    "gender": "Male",
    "age": 39,
    "thumb": "/assets/pilots/thumb/p010.webp",
    "portrait": "/assets/pilots/full/p010.webp"
  },
  {
    "id": "p011",
    "name": "Amina Diallo",
    "gender": "Female",
    "age": 52,
    "thumb": "/assets/pilots/thumb/p011.webp",
    "portrait": "/assets/pilots/full/p011.webp"
  },
  {
    "id": "p012",
    "name": "Diego Salas",
    "gender": "Male",
    "age": 27,
    "thumb": "/assets/pilots/thumb/p012.webp",
    "portrait": "/assets/pilots/full/p012.webp"
  },
  {
    "id": "p013",
    "name": "Kenji Mori",
    "gender": "Male",
    "age": 64,
    "thumb": "/assets/pilots/thumb/p013.webp",
    "portrait": "/assets/pilots/full/p013.webp"
  },
  {
    "id": "p014",
    "name": "Sofia Marin",
    "gender": "Female",
    "age": 33,
    "thumb": "/assets/pilots/thumb/p014.webp",
    "portrait": "/assets/pilots/full/p014.webp"
  },
  {
    "id": "p015",
    "name": "Ibrahim Sane",
    "gender": "Male",
    "age": 44,
    "thumb": "/assets/pilots/thumb/p015.webp",
    "portrait": "/assets/pilots/full/p015.webp"
  },
  {
    "id": "p016",
    "name": "Nora Kapoor",
    "gender": "Female",
    "age": 36,
    "thumb": "/assets/pilots/thumb/p016.webp",
    "portrait": "/assets/pilots/full/p016.webp"
  },
  {
    "id": "p017",
    "name": "Peter Okonkwo",
    "gender": "Male",
    "age": 58,
    "thumb": "/assets/pilots/thumb/p017.webp",
    "portrait": "/assets/pilots/full/p017.webp"
  },
  {
    "id": "p018",
    "name": "Samir Haddad",
    "gender": "Male",
    "age": 52,
    "thumb": "/assets/pilots/thumb/p018.webp",
    "portrait": "/assets/pilots/full/p018.webp"
  },
  {
    "id": "p019",
    "name": "Ruth Adelman",
    "gender": "Female",
    "age": 61,
    "thumb": "/assets/pilots/thumb/p019.webp",
    "portrait": "/assets/pilots/full/p019.webp"
  },
  {
    "id": "p020",
    "name": "Owen Platt",
    "gender": "Male",
    "age": 68,
    "thumb": "/assets/pilots/thumb/p020.webp",
    "portrait": "/assets/pilots/full/p020.webp"
  },
  {
    "id": "p021",
    "name": "Michael Carter",
    "gender": "Male",
    "age": 55,
    "thumb": "/assets/pilots/thumb/p021.webp",
    "portrait": "/assets/pilots/full/p021.webp"
  },
  {
    "id": "p022",
    "name": "Claire Dunne",
    "gender": "Female",
    "age": 59,
    "thumb": "/assets/pilots/thumb/p022.webp",
    "portrait": "/assets/pilots/full/p022.webp"
  },
  {
    "id": "p023",
    "name": "Robert Nguyen",
    "gender": "Male",
    "age": 57,
    "thumb": "/assets/pilots/thumb/p023.webp",
    "portrait": "/assets/pilots/full/p023.webp"
  },
  {
    "id": "p024",
    "name": "Lina Berg",
    "gender": "Female",
    "age": 63,
    "thumb": "/assets/pilots/thumb/p024.webp",
    "portrait": "/assets/pilots/full/p024.webp"
  },
  {
    "id": "p025",
    "name": "David Okada",
    "gender": "Male",
    "age": 60,
    "thumb": "/assets/pilots/thumb/p025.webp",
    "portrait": "/assets/pilots/full/p025.webp"
  },
  {
    "id": "p026",
    "name": "Grace Yuen",
    "gender": "Female",
    "age": 54,
    "thumb": "/assets/pilots/thumb/p026.webp",
    "portrait": "/assets/pilots/full/p026.webp"
  },
  {
    "id": "p027",
    "name": "James Whitaker",
    "gender": "Male",
    "age": 56,
    "thumb": "/assets/pilots/thumb/p027.webp",
    "portrait": "/assets/pilots/full/p027.webp"
  },
  {
    "id": "p028",
    "name": "Fatima Nasser",
    "gender": "Female",
    "age": 66,
    "thumb": "/assets/pilots/thumb/p028.webp",
    "portrait": "/assets/pilots/full/p028.webp"
  },
  {
    "id": "p029",
    "name": "Thomas Berg",
    "gender": "Male",
    "age": 53,
    "thumb": "/assets/pilots/thumb/p029.webp",
    "portrait": "/assets/pilots/full/p029.webp"
  },
  {
    "id": "p030",
    "name": "Helen Okonkwo",
    "gender": "Female",
    "age": 62,
    "thumb": "/assets/pilots/thumb/p030.webp",
    "portrait": "/assets/pilots/full/p030.webp"
  },
  {
    "id": "p031",
    "name": "William Cho",
    "gender": "Male",
    "age": 67,
    "thumb": "/assets/pilots/thumb/p031.webp",
    "portrait": "/assets/pilots/full/p031.webp"
  },
  {
    "id": "p032",
    "name": "Ingrid Solberg",
    "gender": "Female",
    "age": 58,
    "thumb": "/assets/pilots/thumb/p032.webp",
    "portrait": "/assets/pilots/full/p032.webp"
  },
  {
    "id": "p033",
    "name": "Naomi Feldman",
    "gender": "Female",
    "age": 26,
    "thumb": "/assets/pilots/thumb/p033.webp",
    "portrait": "/assets/pilots/full/p033.webp"
  },
  {
    "id": "p034",
    "name": "Daniel Abebe",
    "gender": "Male",
    "age": 27,
    "thumb": "/assets/pilots/thumb/p034.webp",
    "portrait": "/assets/pilots/full/p034.webp"
  },
  {
    "id": "p035",
    "name": "Joseph Marin",
    "gender": "Male",
    "age": 25,
    "thumb": "/assets/pilots/thumb/p035.webp",
    "portrait": "/assets/pilots/full/p035.webp"
  },
  {
    "id": "p036",
    "name": "Carmen Ruiz",
    "gender": "Female",
    "age": 29,
    "thumb": "/assets/pilots/thumb/p036.webp",
    "portrait": "/assets/pilots/full/p036.webp"
  },
  {
    "id": "p037",
    "name": "Yuki Tanaka",
    "gender": "Female",
    "age": 28,
    "thumb": "/assets/pilots/thumb/p037.webp",
    "portrait": "/assets/pilots/full/p037.webp"
  },
  {
    "id": "p038",
    "name": "Charles Okoye",
    "gender": "Male",
    "age": 30,
    "thumb": "/assets/pilots/thumb/p038.webp",
    "portrait": "/assets/pilots/full/p038.webp"
  },
  {
    "id": "p039",
    "name": "Leila Haddad",
    "gender": "Female",
    "age": 27,
    "thumb": "/assets/pilots/thumb/p039.webp",
    "portrait": "/assets/pilots/full/p039.webp"
  },
  {
    "id": "p040",
    "name": "Anthony Ruiz",
    "gender": "Male",
    "age": 31,
    "thumb": "/assets/pilots/thumb/p040.webp",
    "portrait": "/assets/pilots/full/p040.webp"
  },
  {
    "id": "p041",
    "name": "Mark Feldman",
    "gender": "Male",
    "age": 26,
    "thumb": "/assets/pilots/thumb/p041.webp",
    "portrait": "/assets/pilots/full/p041.webp"
  },
  {
    "id": "p042",
    "name": "Freya Lind",
    "gender": "Female",
    "age": 24,
    "thumb": "/assets/pilots/thumb/p042.webp",
    "portrait": "/assets/pilots/full/p042.webp"
  },
  {
    "id": "p043",
    "name": "Paul Nakamura",
    "gender": "Male",
    "age": 32,
    "thumb": "/assets/pilots/thumb/p043.webp",
    "portrait": "/assets/pilots/full/p043.webp"
  },
  {
    "id": "p044",
    "name": "Amara Boateng",
    "gender": "Female",
    "age": 28,
    "thumb": "/assets/pilots/thumb/p044.webp",
    "portrait": "/assets/pilots/full/p044.webp"
  },
  {
    "id": "p045",
    "name": "Steven Adler",
    "gender": "Male",
    "age": 29,
    "thumb": "/assets/pilots/thumb/p045.webp",
    "portrait": "/assets/pilots/full/p045.webp"
  },
  {
    "id": "p046",
    "name": "Colette March",
    "gender": "Female",
    "age": 33,
    "thumb": "/assets/pilots/thumb/p046.webp",
    "portrait": "/assets/pilots/full/p046.webp"
  },
  {
    "id": "p047",
    "name": "Andrew Costa",
    "gender": "Male",
    "age": 27,
    "thumb": "/assets/pilots/thumb/p047.webp",
    "portrait": "/assets/pilots/full/p047.webp"
  },
  {
    "id": "p048",
    "name": "Joshua Park",
    "gender": "Male",
    "age": 30,
    "thumb": "/assets/pilots/thumb/p048.webp",
    "portrait": "/assets/pilots/full/p048.webp"
  },
  {
    "id": "p049",
    "name": "Kenneth Shaw",
    "gender": "Male",
    "age": 41,
    "thumb": "/assets/pilots/thumb/p049.webp",
    "portrait": "/assets/pilots/full/p049.webp"
  },
  {
    "id": "p050",
    "name": "Rosa Delgado",
    "gender": "Female",
    "age": 46,
    "thumb": "/assets/pilots/thumb/p050.webp",
    "portrait": "/assets/pilots/full/p050.webp"
  },
  {
    "id": "p051",
    "name": "Brian Delgado",
    "gender": "Male",
    "age": 48,
    "thumb": "/assets/pilots/thumb/p051.webp",
    "portrait": "/assets/pilots/full/p051.webp"
  },
  {
    "id": "p052",
    "name": "George Novak",
    "gender": "Male",
    "age": 44,
    "thumb": "/assets/pilots/thumb/p052.webp",
    "portrait": "/assets/pilots/full/p052.webp"
  },
  {
    "id": "p053",
    "name": "Mei Chen",
    "gender": "Female",
    "age": 35,
    "thumb": "/assets/pilots/thumb/p053.webp",
    "portrait": "/assets/pilots/full/p053.webp"
  },
  {
    "id": "p054",
    "name": "Edward Sato",
    "gender": "Male",
    "age": 34,
    "thumb": "/assets/pilots/thumb/p054.webp",
    "portrait": "/assets/pilots/full/p054.webp"
  },
  {
    "id": "p055",
    "name": "Anika Shah",
    "gender": "Female",
    "age": 49,
    "thumb": "/assets/pilots/thumb/p055.webp",
    "portrait": "/assets/pilots/full/p055.webp"
  },
  {
    "id": "p056",
    "name": "Ronald Brooks",
    "gender": "Male",
    "age": 51,
    "thumb": "/assets/pilots/thumb/p056.webp",
    "portrait": "/assets/pilots/full/p056.webp"
  },
  {
    "id": "p057",
    "name": "Timothy Ward",
    "gender": "Male",
    "age": 52,
    "thumb": "/assets/pilots/thumb/p057.webp",
    "portrait": "/assets/pilots/full/p057.webp"
  },
  {
    "id": "p058",
    "name": "Petra Novak",
    "gender": "Female",
    "age": 40,
    "thumb": "/assets/pilots/thumb/p058.webp",
    "portrait": "/assets/pilots/full/p058.webp"
  },
  {
    "id": "p059",
    "name": "Jason Klein",
    "gender": "Male",
    "age": 45,
    "thumb": "/assets/pilots/thumb/p059.webp",
    "portrait": "/assets/pilots/full/p059.webp"
  },
  {
    "id": "p060",
    "name": "Joelle Martin",
    "gender": "Female",
    "age": 43,
    "thumb": "/assets/pilots/thumb/p060.webp",
    "portrait": "/assets/pilots/full/p060.webp"
  },
  {
    "id": "p061",
    "name": "Jeffrey Quinn",
    "gender": "Male",
    "age": 38,
    "thumb": "/assets/pilots/thumb/p061.webp",
    "portrait": "/assets/pilots/full/p061.webp"
  },
  {
    "id": "p062",
    "name": "Hana Sato",
    "gender": "Female",
    "age": 50,
    "thumb": "/assets/pilots/thumb/p062.webp",
    "portrait": "/assets/pilots/full/p062.webp"
  },
  {
    "id": "p063",
    "name": "Ryan Costa",
    "gender": "Male",
    "age": 47,
    "thumb": "/assets/pilots/thumb/p063.webp",
    "portrait": "/assets/pilots/full/p063.webp"
  },
  {
    "id": "p064",
    "name": "Imani Brooks",
    "gender": "Female",
    "age": 42,
    "thumb": "/assets/pilots/thumb/p064.webp",
    "portrait": "/assets/pilots/full/p064.webp"
  },
  {
    "id": "p065",
    "name": "Gary Petrov",
    "gender": "Male",
    "age": 34,
    "thumb": "/assets/pilots/thumb/p065.webp",
    "portrait": "/assets/pilots/full/p065.webp"
  },
  {
    "id": "p066",
    "name": "Nicholas Byrne",
    "gender": "Male",
    "age": 36,
    "thumb": "/assets/pilots/thumb/p066.webp",
    "portrait": "/assets/pilots/full/p066.webp"
  },
  {
    "id": "p067",
    "name": "Eric Khalil",
    "gender": "Male",
    "age": 49,
    "thumb": "/assets/pilots/thumb/p067.webp",
    "portrait": "/assets/pilots/full/p067.webp"
  },
  {
    "id": "p068",
    "name": "Celeste Ward",
    "gender": "Female",
    "age": 33,
    "thumb": "/assets/pilots/thumb/p068.webp",
    "portrait": "/assets/pilots/full/p068.webp"
  },
  {
    "id": "p069",
    "name": "Stephen Harlow",
    "gender": "Male",
    "age": 44,
    "thumb": "/assets/pilots/thumb/p069.webp",
    "portrait": "/assets/pilots/full/p069.webp"
  },
  {
    "id": "p070",
    "name": "Nia Okeke",
    "gender": "Female",
    "age": 38,
    "thumb": "/assets/pilots/thumb/p070.webp",
    "portrait": "/assets/pilots/full/p070.webp"
  },
  {
    "id": "p071",
    "name": "Jonathan Reyes",
    "gender": "Male",
    "age": 41,
    "thumb": "/assets/pilots/thumb/p071.webp",
    "portrait": "/assets/pilots/full/p071.webp"
  },
  {
    "id": "p072",
    "name": "Larry Mori",
    "gender": "Male",
    "age": 46,
    "thumb": "/assets/pilots/thumb/p072.webp",
    "portrait": "/assets/pilots/full/p072.webp"
  },
  {
    "id": "p073",
    "name": "Margot Klein",
    "gender": "Female",
    "age": 32,
    "thumb": "/assets/pilots/thumb/p073.webp",
    "portrait": "/assets/pilots/full/p073.webp"
  },
  {
    "id": "p074",
    "name": "Justin Holm",
    "gender": "Male",
    "age": 40,
    "thumb": "/assets/pilots/thumb/p074.webp",
    "portrait": "/assets/pilots/full/p074.webp"
  },
  {
    "id": "p075",
    "name": "Sable Quinn",
    "gender": "Female",
    "age": 37,
    "thumb": "/assets/pilots/thumb/p075.webp",
    "portrait": "/assets/pilots/full/p075.webp"
  },
  {
    "id": "p076",
    "name": "Scott Fournier",
    "gender": "Male",
    "age": 35,
    "thumb": "/assets/pilots/thumb/p076.webp",
    "portrait": "/assets/pilots/full/p076.webp"
  },
  {
    "id": "p077",
    "name": "Brandon Mensah",
    "gender": "Male",
    "age": 52,
    "thumb": "/assets/pilots/thumb/p077.webp",
    "portrait": "/assets/pilots/full/p077.webp"
  },
  {
    "id": "p078",
    "name": "Renata Costa",
    "gender": "Female",
    "age": 39,
    "thumb": "/assets/pilots/thumb/p078.webp",
    "portrait": "/assets/pilots/full/p078.webp"
  },
  {
    "id": "p079",
    "name": "Benjamin Palacios",
    "gender": "Male",
    "age": 36,
    "thumb": "/assets/pilots/thumb/p079.webp",
    "portrait": "/assets/pilots/full/p079.webp"
  },
  {
    "id": "p080",
    "name": "Olga Petrov",
    "gender": "Female",
    "age": 45,
    "thumb": "/assets/pilots/thumb/p080.webp",
    "portrait": "/assets/pilots/full/p080.webp"
  },
  {
    "id": "p081",
    "name": "Samuel Veld",
    "gender": "Male",
    "age": 51,
    "thumb": "/assets/pilots/thumb/p081.webp",
    "portrait": "/assets/pilots/full/p081.webp"
  },
  {
    "id": "p082",
    "name": "Raymond Vega",
    "gender": "Male",
    "age": 44,
    "thumb": "/assets/pilots/thumb/p082.webp",
    "portrait": "/assets/pilots/full/p082.webp"
  },
  {
    "id": "p083",
    "name": "Tessa Byrne",
    "gender": "Female",
    "age": 53,
    "thumb": "/assets/pilots/thumb/p083.webp",
    "portrait": "/assets/pilots/full/p083.webp"
  },
  {
    "id": "p084",
    "name": "Frank Crane",
    "gender": "Male",
    "age": 58,
    "thumb": "/assets/pilots/thumb/p084.webp",
    "portrait": "/assets/pilots/full/p084.webp"
  },
  {
    "id": "p085",
    "name": "Amira Khalil",
    "gender": "Female",
    "age": 47,
    "thumb": "/assets/pilots/thumb/p085.webp",
    "portrait": "/assets/pilots/full/p085.webp"
  },
  {
    "id": "p086",
    "name": "Patrick Qureshi",
    "gender": "Male",
    "age": 49,
    "thumb": "/assets/pilots/thumb/p086.webp",
    "portrait": "/assets/pilots/full/p086.webp"
  },
  {
    "id": "p087",
    "name": "June Harlow",
    "gender": "Female",
    "age": 42,
    "thumb": "/assets/pilots/thumb/p087.webp",
    "portrait": "/assets/pilots/full/p087.webp"
  },
  {
    "id": "p088",
    "name": "Jack Shaw",
    "gender": "Male",
    "age": 50,
    "thumb": "/assets/pilots/thumb/p088.webp",
    "portrait": "/assets/pilots/full/p088.webp"
  },
  {
    "id": "p089",
    "name": "Dennis Osman",
    "gender": "Male",
    "age": 40,
    "thumb": "/assets/pilots/thumb/p089.webp",
    "portrait": "/assets/pilots/full/p089.webp"
  },
  {
    "id": "p090",
    "name": "Paloma Reyes",
    "gender": "Female",
    "age": 46,
    "thumb": "/assets/pilots/thumb/p090.webp",
    "portrait": "/assets/pilots/full/p090.webp"
  },
  {
    "id": "p091",
    "name": "Jerry Vogel",
    "gender": "Male",
    "age": 48,
    "thumb": "/assets/pilots/thumb/p091.webp",
    "portrait": "/assets/pilots/full/p091.webp"
  },
  {
    "id": "p092",
    "name": "Keiko Mori",
    "gender": "Female",
    "age": 43,
    "thumb": "/assets/pilots/thumb/p092.webp",
    "portrait": "/assets/pilots/full/p092.webp"
  },
  {
    "id": "p093",
    "name": "Tyler Laurent",
    "gender": "Male",
    "age": 55,
    "thumb": "/assets/pilots/thumb/p093.webp",
    "portrait": "/assets/pilots/full/p093.webp"
  },
  {
    "id": "p094",
    "name": "Astrid Holm",
    "gender": "Female",
    "age": 41,
    "thumb": "/assets/pilots/thumb/p094.webp",
    "portrait": "/assets/pilots/full/p094.webp"
  },
  {
    "id": "p095",
    "name": "Aaron Alami",
    "gender": "Male",
    "age": 45,
    "thumb": "/assets/pilots/thumb/p095.webp",
    "portrait": "/assets/pilots/full/p095.webp"
  },
  {
    "id": "p096",
    "name": "Nadine Fournier",
    "gender": "Female",
    "age": 60,
    "thumb": "/assets/pilots/thumb/p096.webp",
    "portrait": "/assets/pilots/full/p096.webp"
  },
  {
    "id": "p097",
    "name": "Zola Mensah",
    "gender": "Female",
    "age": 34,
    "thumb": "/assets/pilots/thumb/p097.webp",
    "portrait": "/assets/pilots/full/p097.webp"
  },
  {
    "id": "p098",
    "name": "Jose Park",
    "gender": "Male",
    "age": 29,
    "thumb": "/assets/pilots/thumb/p098.webp",
    "portrait": "/assets/pilots/full/p098.webp"
  },
  {
    "id": "p099",
    "name": "Adam Mendez",
    "gender": "Male",
    "age": 48,
    "thumb": "/assets/pilots/thumb/p099.webp",
    "portrait": "/assets/pilots/full/p099.webp"
  },
  {
    "id": "p100",
    "name": "Nathan Belov",
    "gender": "Male",
    "age": 33,
    "thumb": "/assets/pilots/thumb/p100.webp",
    "portrait": "/assets/pilots/full/p100.webp"
  },
  {
    "id": "p101",
    "name": "Irene Palacios",
    "gender": "Female",
    "age": 36,
    "thumb": "/assets/pilots/thumb/p101.webp",
    "portrait": "/assets/pilots/full/p101.webp"
  },
  {
    "id": "p102",
    "name": "Saskia Veld",
    "gender": "Female",
    "age": 35,
    "thumb": "/assets/pilots/thumb/p102.webp",
    "portrait": "/assets/pilots/full/p102.webp"
  },
  {
    "id": "p103",
    "name": "Henry Grant",
    "gender": "Male",
    "age": 52,
    "thumb": "/assets/pilots/thumb/p103.webp",
    "portrait": "/assets/pilots/full/p103.webp"
  },
  {
    "id": "p104",
    "name": "Douglas Tehrani",
    "gender": "Male",
    "age": 46,
    "thumb": "/assets/pilots/thumb/p104.webp",
    "portrait": "/assets/pilots/full/p104.webp"
  },
  {
    "id": "p105",
    "name": "Marisol Vega",
    "gender": "Female",
    "age": 32,
    "thumb": "/assets/pilots/thumb/p105.webp",
    "portrait": "/assets/pilots/full/p105.webp"
  },
  {
    "id": "p106",
    "name": "Zachary Cho",
    "gender": "Male",
    "age": 31,
    "thumb": "/assets/pilots/thumb/p106.webp",
    "portrait": "/assets/pilots/full/p106.webp"
  },
  {
    "id": "p107",
    "name": "Edith Crane",
    "gender": "Female",
    "age": 44,
    "thumb": "/assets/pilots/thumb/p107.webp",
    "portrait": "/assets/pilots/full/p107.webp"
  },
  {
    "id": "p108",
    "name": "Kyle Dubois",
    "gender": "Male",
    "age": 40,
    "thumb": "/assets/pilots/thumb/p108.webp",
    "portrait": "/assets/pilots/full/p108.webp"
  },
  {
    "id": "p109",
    "name": "Noah Park",
    "gender": "Male",
    "age": 49,
    "thumb": "/assets/pilots/thumb/p109.webp",
    "portrait": "/assets/pilots/full/p109.webp"
  },
  {
    "id": "p110",
    "name": "Farah Qureshi",
    "gender": "Female",
    "age": 37,
    "thumb": "/assets/pilots/thumb/p110.webp",
    "portrait": "/assets/pilots/full/p110.webp"
  },
  {
    "id": "p111",
    "name": "Ethan Moreau",
    "gender": "Male",
    "age": 47,
    "thumb": "/assets/pilots/thumb/p111.webp",
    "portrait": "/assets/pilots/full/p111.webp"
  },
  {
    "id": "p112",
    "name": "Bonnie Shaw",
    "gender": "Female",
    "age": 43,
    "thumb": "/assets/pilots/thumb/p112.webp",
    "portrait": "/assets/pilots/full/p112.webp"
  },
  {
    "id": "p113",
    "name": "Dylan Iyer",
    "gender": "Male",
    "age": 68,
    "thumb": "/assets/pilots/thumb/p113.webp",
    "portrait": "/assets/pilots/full/p113.webp"
  },
  {
    "id": "p114",
    "name": "Christian Desta",
    "gender": "Male",
    "age": 62,
    "thumb": "/assets/pilots/thumb/p114.webp",
    "portrait": "/assets/pilots/full/p114.webp"
  },
  {
    "id": "p115",
    "name": "Austin Calder",
    "gender": "Male",
    "age": 70,
    "thumb": "/assets/pilots/thumb/p115.webp",
    "portrait": "/assets/pilots/full/p115.webp"
  },
  {
    "id": "p116",
    "name": "Sean Laurent",
    "gender": "Male",
    "age": 56,
    "thumb": "/assets/pilots/thumb/p116.webp",
    "portrait": "/assets/pilots/full/p116.webp"
  },
  {
    "id": "p117",
    "name": "Caleb Iyer",
    "gender": "Male",
    "age": 61,
    "thumb": "/assets/pilots/thumb/p117.webp",
    "portrait": "/assets/pilots/full/p117.webp"
  },
  {
    "id": "p118",
    "name": "Lucas Moreau",
    "gender": "Male",
    "age": 58,
    "thumb": "/assets/pilots/thumb/p118.webp",
    "portrait": "/assets/pilots/full/p118.webp"
  },
  {
    "id": "p119",
    "name": "Laila Osman",
    "gender": "Female",
    "age": 54,
    "thumb": "/assets/pilots/thumb/p119.webp",
    "portrait": "/assets/pilots/full/p119.webp"
  },
  {
    "id": "p120",
    "name": "Ian Calder",
    "gender": "Male",
    "age": 66,
    "thumb": "/assets/pilots/thumb/p120.webp",
    "portrait": "/assets/pilots/full/p120.webp"
  },
  {
    "id": "p121",
    "name": "Miles Okonkwo",
    "gender": "Male",
    "age": 60,
    "thumb": "/assets/pilots/thumb/p121.webp",
    "portrait": "/assets/pilots/full/p121.webp"
  },
  {
    "id": "p122",
    "name": "Greta Vogel",
    "gender": "Female",
    "age": 52,
    "thumb": "/assets/pilots/thumb/p122.webp",
    "portrait": "/assets/pilots/full/p122.webp"
  },
  {
    "id": "p123",
    "name": "Hugo Berg",
    "gender": "Male",
    "age": 57,
    "thumb": "/assets/pilots/thumb/p123.webp",
    "portrait": "/assets/pilots/full/p123.webp"
  },
  {
    "id": "p124",
    "name": "Camille Laurent",
    "gender": "Female",
    "age": 67,
    "thumb": "/assets/pilots/thumb/p124.webp",
    "portrait": "/assets/pilots/full/p124.webp"
  },
  {
    "id": "p125",
    "name": "Felix Sato",
    "gender": "Male",
    "age": 59,
    "thumb": "/assets/pilots/thumb/p125.webp",
    "portrait": "/assets/pilots/full/p125.webp"
  },
  {
    "id": "p126",
    "name": "Noor Alami",
    "gender": "Female",
    "age": 55,
    "thumb": "/assets/pilots/thumb/p126.webp",
    "portrait": "/assets/pilots/full/p126.webp"
  },
  {
    "id": "p127",
    "name": "Oscar Ruiz",
    "gender": "Male",
    "age": 53,
    "thumb": "/assets/pilots/thumb/p127.webp",
    "portrait": "/assets/pilots/full/p127.webp"
  },
  {
    "id": "p128",
    "name": "Victor Abebe",
    "gender": "Male",
    "age": 69,
    "thumb": "/assets/pilots/thumb/p128.webp",
    "portrait": "/assets/pilots/full/p128.webp"
  },
  {
    "id": "p129",
    "name": "Leo Nakamura",
    "gender": "Male",
    "age": 34,
    "thumb": "/assets/pilots/thumb/p129.webp",
    "portrait": "/assets/pilots/full/p129.webp"
  },
  {
    "id": "p130",
    "name": "Evelyn Park",
    "gender": "Female",
    "age": 36,
    "thumb": "/assets/pilots/thumb/p130.webp",
    "portrait": "/assets/pilots/full/p130.webp"
  },
  {
    "id": "p131",
    "name": "Simon Adler",
    "gender": "Male",
    "age": 38,
    "thumb": "/assets/pilots/thumb/p131.webp",
    "portrait": "/assets/pilots/full/p131.webp"
  },
  {
    "id": "p132",
    "name": "Rosario Mendez",
    "gender": "Female",
    "age": 41,
    "thumb": "/assets/pilots/thumb/p132.webp",
    "portrait": "/assets/pilots/full/p132.webp"
  },
  {
    "id": "p133",
    "name": "Theo Costa",
    "gender": "Male",
    "age": 39,
    "thumb": "/assets/pilots/thumb/p133.webp",
    "portrait": "/assets/pilots/full/p133.webp"
  },
  {
    "id": "p134",
    "name": "Kira Belov",
    "gender": "Female",
    "age": 48,
    "thumb": "/assets/pilots/thumb/p134.webp",
    "portrait": "/assets/pilots/full/p134.webp"
  },
  {
    "id": "p135",
    "name": "Elliot Brooks",
    "gender": "Male",
    "age": 42,
    "thumb": "/assets/pilots/thumb/p135.webp",
    "portrait": "/assets/pilots/full/p135.webp"
  },
  {
    "id": "p136",
    "name": "Annelise Grant",
    "gender": "Female",
    "age": 45,
    "thumb": "/assets/pilots/thumb/p136.webp",
    "portrait": "/assets/pilots/full/p136.webp"
  },
  {
    "id": "p137",
    "name": "Malcolm Ward",
    "gender": "Male",
    "age": 37,
    "thumb": "/assets/pilots/thumb/p137.webp",
    "portrait": "/assets/pilots/full/p137.webp"
  },
  {
    "id": "p138",
    "name": "Curtis Quinn",
    "gender": "Male",
    "age": 40,
    "thumb": "/assets/pilots/thumb/p138.webp",
    "portrait": "/assets/pilots/full/p138.webp"
  },
  {
    "id": "p139",
    "name": "Soraya Tehrani",
    "gender": "Female",
    "age": 50,
    "thumb": "/assets/pilots/thumb/p139.webp",
    "portrait": "/assets/pilots/full/p139.webp"
  },
  {
    "id": "p140",
    "name": "Winnie Cho",
    "gender": "Female",
    "age": 36,
    "thumb": "/assets/pilots/thumb/p140.webp",
    "portrait": "/assets/pilots/full/p140.webp"
  },
  {
    "id": "p141",
    "name": "Harvey Klein",
    "gender": "Male",
    "age": 49,
    "thumb": "/assets/pilots/thumb/p141.webp",
    "portrait": "/assets/pilots/full/p141.webp"
  },
  {
    "id": "p142",
    "name": "Beatriz Lima",
    "gender": "Female",
    "age": 35,
    "thumb": "/assets/pilots/thumb/p142.webp",
    "portrait": "/assets/pilots/full/p142.webp"
  },
  {
    "id": "p143",
    "name": "Wesley Petrov",
    "gender": "Male",
    "age": 38,
    "thumb": "/assets/pilots/thumb/p143.webp",
    "portrait": "/assets/pilots/full/p143.webp"
  },
  {
    "id": "p144",
    "name": "Helene Dubois",
    "gender": "Female",
    "age": 47,
    "thumb": "/assets/pilots/thumb/p144.webp",
    "portrait": "/assets/pilots/full/p144.webp"
  },
  {
    "id": "p145",
    "name": "Grant Byrne",
    "gender": "Male",
    "age": 42,
    "thumb": "/assets/pilots/thumb/p145.webp",
    "portrait": "/assets/pilots/full/p145.webp"
  },
  {
    "id": "p146",
    "name": "Mina Park",
    "gender": "Female",
    "age": 46,
    "thumb": "/assets/pilots/thumb/p146.webp",
    "portrait": "/assets/pilots/full/p146.webp"
  },
  {
    "id": "p147",
    "name": "Colin Khalil",
    "gender": "Male",
    "age": 48,
    "thumb": "/assets/pilots/thumb/p147.webp",
    "portrait": "/assets/pilots/full/p147.webp"
  },
  {
    "id": "p148",
    "name": "Odette Laurent",
    "gender": "Female",
    "age": 51,
    "thumb": "/assets/pilots/thumb/p148.webp",
    "portrait": "/assets/pilots/full/p148.webp"
  },
  {
    "id": "p149",
    "name": "Spencer Harlow",
    "gender": "Male",
    "age": 38,
    "thumb": "/assets/pilots/thumb/p149.webp",
    "portrait": "/assets/pilots/full/p149.webp"
  },
  {
    "id": "p150",
    "name": "Priyanka Iyer",
    "gender": "Female",
    "age": 52,
    "thumb": "/assets/pilots/thumb/p150.webp",
    "portrait": "/assets/pilots/full/p150.webp"
  },
  {
    "id": "p151",
    "name": "Dean Reyes",
    "gender": "Male",
    "age": 40,
    "thumb": "/assets/pilots/thumb/p151.webp",
    "portrait": "/assets/pilots/full/p151.webp"
  },
  {
    "id": "p152",
    "name": "Selam Desta",
    "gender": "Female",
    "age": 44,
    "thumb": "/assets/pilots/thumb/p152.webp",
    "portrait": "/assets/pilots/full/p152.webp"
  },
  {
    "id": "p153",
    "name": "Ruthie Calder",
    "gender": "Female",
    "age": 49,
    "thumb": "/assets/pilots/thumb/p153.webp",
    "portrait": "/assets/pilots/full/p153.webp"
  },
  {
    "id": "p154",
    "name": "Warren Mori",
    "gender": "Male",
    "age": 43,
    "thumb": "/assets/pilots/thumb/p154.webp",
    "portrait": "/assets/pilots/full/p154.webp"
  },
  {
    "id": "p155",
    "name": "Russell Holm",
    "gender": "Male",
    "age": 45,
    "thumb": "/assets/pilots/thumb/p155.webp",
    "portrait": "/assets/pilots/full/p155.webp"
  },
  {
    "id": "p156",
    "name": "Ines Moreau",
    "gender": "Female",
    "age": 47,
    "thumb": "/assets/pilots/thumb/p156.webp",
    "portrait": "/assets/pilots/full/p156.webp"
  },
  {
    "id": "p157",
    "name": "Yvonne Berger",
    "gender": "Female",
    "age": 50,
    "thumb": "/assets/pilots/thumb/p157.webp",
    "portrait": "/assets/pilots/full/p157.webp"
  },
  {
    "id": "p158",
    "name": "Philip Mensah",
    "gender": "Male",
    "age": 54,
    "thumb": "/assets/pilots/thumb/p158.webp",
    "portrait": "/assets/pilots/full/p158.webp"
  },
  {
    "id": "p159",
    "name": "Martin Palacios",
    "gender": "Male",
    "age": 39,
    "thumb": "/assets/pilots/thumb/p159.webp",
    "portrait": "/assets/pilots/full/p159.webp"
  },
  {
    "id": "p160",
    "name": "Lucia Ferrer",
    "gender": "Female",
    "age": 41,
    "thumb": "/assets/pilots/thumb/p160.webp",
    "portrait": "/assets/pilots/full/p160.webp"
  }
]

const byId = new Map(PILOT_ROSTER.map((p) => [p.id, p]))

export function pilotIdentity(id: string): PilotIdentity | undefined {
  return byId.get(id)
}

export function claimIdentity(used: Set<string>, seed: string): PilotIdentity {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  const start = (h >>> 0) % PILOT_ROSTER.length
  for (let i = 0; i < PILOT_ROSTER.length; i++) {
    const row = PILOT_ROSTER[(start + i) % PILOT_ROSTER.length]
    if (!used.has(row.id)) return row
  }
  return PILOT_ROSTER[start]
}

export function takeIdentity(used: Set<string>): PilotIdentity {
  const free = PILOT_ROSTER.find((row) => !used.has(row.id))
  return free ?? PILOT_ROSTER[used.size % PILOT_ROSTER.length]
}

export function experienceLabel(hours: number): string {
  if (hours >= 10000) return 'Senior Captain'
  if (hours >= 6500) return 'Captain'
  if (hours >= 4000) return 'Senior First Officer'
  return 'First Officer'
}

export function fatigueLabel(fatigue: number): string {
  if (fatigue < 35) return 'Low'
  if (fatigue < 60) return 'Moderate'
  if (fatigue < 80) return 'High'
  return 'Severe'
}

export function pilotStatus(fatigue: number): string {
  if (fatigue >= 75) return 'Fatigued'
  if (fatigue >= 55) return 'On duty'
  return 'Available'
}
