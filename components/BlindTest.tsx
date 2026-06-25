"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase"
import { stopAmbiance, startAmbiance, isAmbiancePlaying } from "@/lib/ambiance"
import { getSavedVolume, getSavedMuted } from "@/lib/theme"

interface Props {
  members: any[]
  myUserId: string
  onAwardDistance: (userId: string, delta: number) => void
  onClose: () => void
}

// ── CATALOGUE ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "rap_fr",   label: "Rap FR",           emoji: "🎤" },
  { id: "pop",      label: "Pop",               emoji: "🎵" },
  { id: "2000s",    label: "Années 2000",        emoji: "📼" },
  { id: "90s",      label: "Années 90",          emoji: "🕺" },
  { id: "rnb",      label: "RnB",               emoji: "🔥" },
  { id: "inter",    label: "Hits Internationaux",emoji: "🌍" },
]

const SONGS: Record<string, {title:string; artist:string; wrong:[string,string,string]}[]> = {
  rap_fr: [
    { title:"Validé",              artist:"Booba",          wrong:["Freeze Corleone","SCH","Ninho"] },
    { title:"Tout va bien",        artist:"Orelsan",        wrong:["Bigflo & Oli","Vianney","Nekfeu"] },
    { title:"Chocolat",            artist:"Awa Imani",      wrong:["Aya Nakamura","Niska","MHD"] },
    { title:"Bande organisée",     artist:"Jul",            wrong:["SCH","Soso Maness","Niro"] },
    { title:"Nuit 17 à 52",        artist:"Orelsan",        wrong:["Nekfeu","Lomepal","Roméo Elvis"] },
    { title:"Bloqué",              artist:"Soolking",       wrong:["Ninho","Niska","Awa Imani"] },
    { title:"Djadja",              artist:"Aya Nakamura",   wrong:["Amel Bent","Vitaa","Wejdene"] },
    { title:"Billie Jean (remix)", artist:"Ninho",          wrong:["Booba","Kaaris","Sadek"] },
    { title:"Fuego",               artist:"Soprano",        wrong:["Alonzo","Jul","Soso Maness"] },
    { title:"Destinée",            artist:"Maes",           wrong:["Freeze Corleone","Ninho","Zola"] },
    { title:"Woah",                artist:"Niska",          wrong:["Ninho","Awa Imani","Leto"] },
    { title:"JVLIVS",              artist:"SCH",            wrong:["Booba","Kaaris","Lacrim"] },
    { title:"Lemon",               artist:"Nekfeu",         wrong:["Orelsan","Lomepal","Roméo Elvis"] },
    { title:"Si t'as l'amour",     artist:"Soso Maness",    wrong:["Niro","Alonzo","Julien Doré"] },
    { title:"Freestyle Caraïbes",  artist:"Damso",          wrong:["Hamza","Roméo Elvis","Lomepal"] },
    { title:"Réseaux",             artist:"Awa Imani",      wrong:["Vitaa","Slimane","Wejdene"] },
    { title:"Freestyle Grünt",     artist:"Freeze Corleone",wrong:["Zola","Ninho","Maes"] },
    { title:"Sur ma route",        artist:"Black M",        wrong:["Maître Gims","Awa Imani","Soolking"] },
    { title:"Bella",               artist:"Maître Gims",    wrong:["Awa Imani","Naps","Alonzo"] },
    { title:"Laisser vivre",       artist:"Alonzo",         wrong:["Soso Maness","Niro","SCH"] },
    { title:"Aïcha",               artist:"Khaled",         wrong:["Cheb Mami","Stromae","Magic System"] },
    { title:"Nouveau Gabon",       artist:"MHD",            wrong:["Black M","Maître Gims","Awa Imani"] },
    { title:"Allez",               artist:"Sofiane",        wrong:["Ninho","Kalash Criminel","Maes"] },
    { title:"Merci",               artist:"BigFlo & Oli",   wrong:["Orelsan","Vianney","Nekfeu"] },
    { title:"Rouleau compresseur", artist:"Kaaris",         wrong:["Booba","SCH","Lacrim"] },
    { title:"Médicament",          artist:"Lomepal",        wrong:["Orelsan","Roméo Elvis","Bagarre"] },
    { title:"Longévité",           artist:"Zola",           wrong:["Ninho","Maes","Freeze Corleone"] },
    { title:"J'suis QLF",          artist:"Youssoupha",     wrong:["Soprano","Kery James","Oxmo Puccino"] },
    { title:"Garde la pêche",      artist:"Vald",           wrong:["Orelsan","Gringe","Eddy de Pretto"] },
    { title:"Madrina",             artist:"Awa Imani",      wrong:["Vitaa","Yseult","Imany"] },
    { title:"Pianos",              artist:"Hamza",          wrong:["Damso","Nekfeu","Lomepal"] },
    { title:"Petrouchka",          artist:"Booba",          wrong:["Kaaris","Lacrim","Sadek"] },
    { title:"Happy End",           artist:"Roméo Elvis",    wrong:["Lomepal","Eddy de Pretto","Bon Entendeur"] },
    { title:"Quand c'est",         artist:"Stromae",        wrong:["Vianney","Orelsan","Julien Doré"] },
    { title:"Meurtre par effraction", artist:"Nekfeu",      wrong:["Lomepal","Orelsan","Roméo Elvis"] },
    { title:"Chocolat",            artist:"Naps",           wrong:["Alonzo","Jul","Soso Maness"] },
    { title:"Autopsie",            artist:"Leto",           wrong:["Zola","Ninho","Maes"] },
    { title:"Bombe atomique",      artist:"Awa Imani",      wrong:["Nicki Minaj","Cardi B","Shayri"] },
    { title:"L'hymne de nos campagnes", artist:"Tryo",      wrong:["Massilia Sound System","La Ruda","Zebda"] },
    { title:"Sale temps",          artist:"Lacrim",         wrong:["Booba","Kaaris","SCH"] },
    { title:"Dans la légende",     artist:"PNL",            wrong:["Freeze Corleone","Maes","Zola"] },
    { title:"Que la famille",      artist:"PNL",            wrong:["Maes","Ninho","Damso"] },
    { title:"Au DD",               artist:"PNL",            wrong:["Freeze Corleone","Zola","Ninho"] },
    { title:"Till I Collapse",     artist:"Eminem",         wrong:["50 Cent","Dr. Dre","Jay-Z"] },
    { title:"Éclipse",             artist:"Sch",            wrong:["Booba","Kaaris","Niro"] },
    { title:"Caillera pour la vie",artist:"Alonzo",         wrong:["Soso Maness","Jul","Naps"] },
    { title:"Papillon",            artist:"Wejdene",        wrong:["Awa Imani","Vitaa","Yseult"] },
    { title:"Jackpot",             artist:"Kalash Criminel",wrong:["Kaaris","Booba","SCH"] },
    { title:"Madame Pavoshnikov",  artist:"Lomepal",        wrong:["Orelsan","Népal","Eddy de Pretto"] },
    { title:"Mowgli",              artist:"Vald",           wrong:["Orelsan","Gringe","Ikbenefarhan"] },
  ],
  pop: [
    { title:"Shape of You",       artist:"Ed Sheeran",      wrong:["Sam Smith","Charlie Puth","James Arthur"] },
    { title:"Blinding Lights",    artist:"The Weeknd",      wrong:["Drake","Post Malone","Bruno Mars"] },
    { title:"Bad Guy",            artist:"Billie Eilish",   wrong:["Olivia Rodrigo","Ariana Grande","Dua Lipa"] },
    { title:"Levitating",         artist:"Dua Lipa",        wrong:["Lizzo","Cardi B","Normani"] },
    { title:"Stay",               artist:"Justin Bieber",   wrong:["The Kid LAROI","Post Malone","Machine Gun Kelly"] },
    { title:"Watermelon Sugar",   artist:"Harry Styles",    wrong:["Niall Horan","Liam Payne","Louis Tomlinson"] },
    { title:"Drivers License",    artist:"Olivia Rodrigo",  wrong:["Billie Eilish","Ariana Grande","Sabrina Carpenter"] },
    { title:"Peaches",            artist:"Justin Bieber",   wrong:["Post Malone","Bruno Mars","Giveon"] },
    { title:"good 4 u",           artist:"Olivia Rodrigo",  wrong:["Dua Lipa","Ava Max","Halsey"] },
    { title:"Shivers",            artist:"Ed Sheeran",      wrong:["Sam Smith","James Bay","Rag'n'Bone Man"] },
    { title:"Heat Waves",         artist:"Glass Animals",   wrong:["Arctic Monkeys","Tame Impala","Jungle"] },
    { title:"Savage Love",        artist:"Jason Derulo",    wrong:["Bruno Mars","Ne-Yo","Usher"] },
    { title:"Dynamite",           artist:"BTS",             wrong:["Blackpink","TWICE","EXO"] },
    { title:"As It Was",          artist:"Harry Styles",    wrong:["Ed Sheeran","Sam Smith","Shawn Mendes"] },
    { title:"Anti-Hero",          artist:"Taylor Swift",    wrong:["Sabrina Carpenter","Olivia Rodrigo","Gracie Abrams"] },
    { title:"Flowers",            artist:"Miley Cyrus",     wrong:["Dua Lipa","Ariana Grande","Selena Gomez"] },
    { title:"Unholy",             artist:"Sam Smith",       wrong:["Kim Petras","Ava Max","Troye Sivan"] },
    { title:"Calm Down",          artist:"Rema",            wrong:["Burna Boy","WizKid","Afrobeats"] },
    { title:"About Damn Time",    artist:"Lizzo",           wrong:["Dua Lipa","Meghan Trainor","Kesha"] },
    { title:"Break My Soul",      artist:"Beyoncé",         wrong:["Rihanna","Destiny's Child","Ciara"] },
    { title:"Running Up That Hill", artist:"Kate Bush",     wrong:["Annie Lennox","Sinéad O'Connor","Pat Benatar"] },
    { title:"Hold On",            artist:"Chord Overstreet",wrong:["James Arthur","Calum Scott","Lewis Capaldi"] },
    { title:"Industry Baby",      artist:"Lil Nas X",       wrong:["Jack Harlow","Doja Cat","Tyler the Creator"] },
    { title:"Butter",             artist:"BTS",             wrong:["NCT 127","Stray Kids","SEVENTEEN"] },
    { title:"Montero",            artist:"Lil Nas X",       wrong:["Doja Cat","Cardi B","Saweetie"] },
    { title:"Easy On Me",         artist:"Adele",           wrong:["Sam Smith","Lewis Capaldi","James Arthur"] },
    { title:"Golden Hour",        artist:"JVKE",            wrong:["Conan Gray","Cian Ducrot","Stephen Sanchez"] },
    { title:"Cupid",              artist:"FIFTY FIFTY",     wrong:["BLACKPINK","aespa","NewJeans"] },
    { title:"Kill Bill",          artist:"SZA",             wrong:["H.E.R.","Jhené Aiko","Summer Walker"] },
    { title:"Escapism",           artist:"RAYE",            wrong:["Dua Lipa","FKA twigs","PinkPantheress"] },
    { title:"Vampire",            artist:"Olivia Rodrigo",  wrong:["Billie Eilish","Gracie Abrams","Sabrina Carpenter"] },
    { title:"Cruel Summer",       artist:"Taylor Swift",    wrong:["Katy Perry","Dua Lipa","Ava Max"] },
    { title:"Die For You",        artist:"The Weeknd",      wrong:["Drake","Nav","PartyNextDoor"] },
    { title:"Rich Flex",          artist:"Drake",           wrong:["21 Savage","Young Thug","Gunna"] },
    { title:"Trustfall",          artist:"Pink",            wrong:["Kelly Clarkson","Alanis Morissette","Sheryl Crow"] },
    { title:"Ghost",              artist:"Justin Bieber",   wrong:["Shawn Mendes","Niall Horan","Lewis Capaldi"] },
    { title:"Love Story",         artist:"Taylor Swift",    wrong:["Selena Gomez","Demi Lovato","Miley Cyrus"] },
    { title:"Shake It Off",       artist:"Taylor Swift",    wrong:["Katy Perry","Meghan Trainor","Carly Rae Jepsen"] },
    { title:"Uptown Funk",        artist:"Bruno Mars",      wrong:["Mark Ronson","Pharrell","Usher"] },
    { title:"Pompeii",            artist:"Bastille",        wrong:["Imagine Dragons","Coldplay","OneRepublic"] },
    { title:"Someone Like You",   artist:"Adele",           wrong:["Amy Winehouse","Duffy","Jessie J"] },
    { title:"Rolling in the Deep",artist:"Adele",           wrong:["Beyoncé","Alicia Keys","Mary J. Blige"] },
    { title:"Thinking Out Loud",  artist:"Ed Sheeran",      wrong:["Sam Smith","John Legend","Bruno Mars"] },
    { title:"Photograph",         artist:"Ed Sheeran",      wrong:["James Arthur","Charlie Puth","Calum Scott"] },
    { title:"Perfect",            artist:"Ed Sheeran",      wrong:["John Legend","Bruno Mars","James Arthur"] },
    { title:"Can't Stop the Feeling", artist:"Justin Timberlake", wrong:["Bruno Mars","Pharrell","Mark Ronson"] },
    { title:"Señorita",           artist:"Shawn Mendes",    wrong:["Camila Cabello","Justin Bieber","Selena Gomez"] },
    { title:"Havana",             artist:"Camila Cabello",  wrong:["Selena Gomez","Shakira","Jennifer Lopez"] },
    { title:"Despacito",          artist:"Luis Fonsi",      wrong:["J Balvin","Bad Bunny","Maluma"] },
    { title:"Lean On",            artist:"Major Lazer",     wrong:["Calvin Harris","Kygo","Avicii"] },
  ],
  "2000s": [
    { title:"Crazy in Love",      artist:"Beyoncé",         wrong:["Rihanna","Alicia Keys","Destiny's Child"] },
    { title:"Umbrella",           artist:"Rihanna",         wrong:["Beyoncé","Ciara","Cassie"] },
    { title:"Yeah!",              artist:"Usher",           wrong:["Ne-Yo","Chris Brown","Mario"] },
    { title:"In da Club",         artist:"50 Cent",         wrong:["Eminem","Ja Rule","DMX"] },
    { title:"Lose Yourself",      artist:"Eminem",          wrong:["50 Cent","Dr. Dre","Kanye West"] },
    { title:"Hey Ya!",            artist:"OutKast",         wrong:["Kanye West","Pharrell","Missy Elliott"] },
    { title:"Toxic",              artist:"Britney Spears",  wrong:["Christina Aguilera","Jessica Simpson","Hilary Duff"] },
    { title:"Beautiful",          artist:"Christina Aguilera", wrong:["Pink","Mariah Carey","Alicia Keys"] },
    { title:"Since U Been Gone",  artist:"Kelly Clarkson",  wrong:["Pink","Alanis Morissette","Avril Lavigne"] },
    { title:"Hips Don't Lie",     artist:"Shakira",         wrong:["Jennifer Lopez","Paulina Rubio","Gloria Estefan"] },
    { title:"Gold Digger",        artist:"Kanye West",      wrong:["Jay-Z","Ludacris","T.I."] },
    { title:"Get Low",            artist:"Lil Jon",         wrong:["Pitbull","Ludacris","T-Pain"] },
    { title:"Numb/Encore",        artist:"Linkin Park / Jay-Z", wrong:["Eminem","Limp Bizkit","Coldplay"] },
    { title:"Boulevard of Broken Dreams", artist:"Green Day", wrong:["Blink-182","Sum 41","Simple Plan"] },
    { title:"Mr. Brightside",     artist:"The Killers",     wrong:["Franz Ferdinand","Interpol","Bloc Party"] },
    { title:"Seven Nation Army",  artist:"The White Stripes",wrong:["The Black Keys","Queens of the Stone Age","Wolfmother"] },
    { title:"Maps",               artist:"Yeah Yeah Yeahs", wrong:["LCD Soundsystem","Hot Chip","Interpol"] },
    { title:"Shake It",           artist:"Metro Station",   wrong:["All Time Low","Forever the Sickest Kids","Cobra Starship"] },
    { title:"Low",                artist:"Flo Rida",        wrong:["T-Pain","Pitbull","Lil Wayne"] },
    { title:"Love Story",         artist:"Taylor Swift",    wrong:["Miley Cyrus","Selena Gomez","Demi Lovato"] },
    { title:"Tik Tok",            artist:"Ke$ha",           wrong:["Katy Perry","Lady Gaga","Rihanna"] },
    { title:"Just Dance",         artist:"Lady Gaga",       wrong:["Ke$ha","Katy Perry","Fergie"] },
    { title:"Bad Romance",        artist:"Lady Gaga",       wrong:["Beyoncé","Rihanna","Katy Perry"] },
    { title:"Poker Face",         artist:"Lady Gaga",       wrong:["Pink","Ke$ha","Fergie"] },
    { title:"California Gurls",   artist:"Katy Perry",      wrong:["Ke$ha","Nicki Minaj","Niki & Vinni"] },
    { title:"OMG",                artist:"Usher",           wrong:["Chris Brown","Ne-Yo","Trey Songz"] },
    { title:"Irreplaceable",      artist:"Beyoncé",         wrong:["Rihanna","Alicia Keys","Mary J. Blige"] },
    { title:"Stronger",           artist:"Kanye West",      wrong:["Jay-Z","Ludacris","T.I."] },
    { title:"Clocks",             artist:"Coldplay",        wrong:["U2","Radiohead","Muse"] },
    { title:"Are You Gonna Be My Girl", artist:"Jet",       wrong:["Franz Ferdinand","Kaiser Chiefs","The Hives"] },
    { title:"Take Me Out",        artist:"Franz Ferdinand", wrong:["The Killers","Arctic Monkeys","Bloc Party"] },
    { title:"Last Nite",          artist:"The Strokes",     wrong:["The Vines","The Hives","The Libertines"] },
    { title:"Fell in Love with a Girl", artist:"The White Stripes", wrong:["The Vines","The Strokes","The Hives"] },
    { title:"Float On",           artist:"Modest Mouse",    wrong:["Death Cab for Cutie","The Shins","Iron & Wine"] },
    { title:"Stacy's Mom",        artist:"Fountains of Wayne", wrong:["Weezer","Barenaked Ladies","The Ataris"] },
    { title:"In Too Deep",        artist:"Sum 41",          wrong:["Simple Plan","Good Charlotte","Blink-182"] },
    { title:"American Idiot",     artist:"Green Day",       wrong:["My Chemical Romance","Fall Out Boy","Panic! at the Disco"] },
    { title:"Sugar We're Goin Down", artist:"Fall Out Boy", wrong:["Panic! at the Disco","My Chemical Romance","The Academy Is"] },
    { title:"I Write Sins",       artist:"Panic! at the Disco", wrong:["My Chemical Romance","The Used","Thursday"] },
    { title:"Welcome to the Black Parade", artist:"My Chemical Romance", wrong:["Linkin Park","Evanescence","Paramore"] },
    { title:"B.Y.O.B.",           artist:"System of a Down",wrong:["Slipknot","Korn","Marilyn Manson"] },
    { title:"Numb",               artist:"Linkin Park",     wrong:["Evanescence","Papa Roach","Nickelback"] },
    { title:"Bring Me to Life",   artist:"Evanescence",     wrong:["Within Temptation","Nightwish","Paramore"] },
    { title:"Paralyzer",          artist:"Finger Eleven",   wrong:["Theory of a Deadman","Default","Our Lady Peace"] },
    { title:"Best of You",        artist:"Foo Fighters",    wrong:["Nickelback","Puddle of Mudd","Creed"] },
    { title:"Be Like That",       artist:"3 Doors Down",    wrong:["Matchbox Twenty","Puddle of Mudd","Creed"] },
    { title:"Move Along",         artist:"The All-American Rejects", wrong:["Yellowcard","Hawthorne Heights","The Starting Line"] },
    { title:"The Middle",         artist:"Jimmy Eat World", wrong:["Dashboard Confessional","Something Corporate","The Get Up Kids"] },
    { title:"Hey There Delilah",  artist:"Plain White T's", wrong:["Jack Johnson","Jason Mraz","John Mayer"] },
    { title:"Apologize",          artist:"OneRepublic",     wrong:["Timbaland","Maroon 5","Matchbox Twenty"] },
    { title:"Viva la Vida",       artist:"Coldplay",        wrong:["U2","Snow Patrol","Keane"] },
  ],
  "90s": [
    { title:"Smells Like Teen Spirit", artist:"Nirvana",    wrong:["Pearl Jam","Soundgarden","Alice in Chains"] },
    { title:"Wonderwall",         artist:"Oasis",           wrong:["Blur","Pulp","Suede"] },
    { title:"...Baby One More Time", artist:"Britney Spears", wrong:["Christina Aguilera","Backstreet Boys","NSYNC"] },
    { title:"Waterfalls",         artist:"TLC",             wrong:["Destiny's Child","En Vogue","SWV"] },
    { title:"No Scrubs",          artist:"TLC",             wrong:["Destiny's Child","Brandy","Monica"] },
    { title:"I Will Always Love You", artist:"Whitney Houston", wrong:["Mariah Carey","Celine Dion","Dolly Parton"] },
    { title:"Gangsta's Paradise", artist:"Coolio",          wrong:["Tupac","Notorious B.I.G.","Snoop Dogg"] },
    { title:"California Love",    artist:"2Pac",            wrong:["Snoop Dogg","Ice Cube","Dr. Dre"] },
    { title:"Hypnotize",          artist:"Notorious B.I.G.",wrong:["Jay-Z","Puff Daddy","Mase"] },
    { title:"Jump",               artist:"Kris Kross",      wrong:["Tag Team","House of Pain","Young MC"] },
    { title:"Ice Ice Baby",       artist:"Vanilla Ice",     wrong:["MC Hammer","Tone Loc","Young MC"] },
    { title:"U Can't Touch This", artist:"MC Hammer",       wrong:["Vanilla Ice","Tone Loc","Young MC"] },
    { title:"Wannabe",            artist:"Spice Girls",     wrong:["All Saints","Atomic Kitten","Sugababes"] },
    { title:"Mmmbop",             artist:"Hanson",          wrong:["Backstreet Boys","NSYNC","98 Degrees"] },
    { title:"Quit Playing Games", artist:"Backstreet Boys", wrong:["NSYNC","98 Degrees","New Kids on the Block"] },
    { title:"Tearin' Up My Heart",artist:"NSYNC",           wrong:["Backstreet Boys","98 Degrees","Boyz II Men"] },
    { title:"Livin' la Vida Loca",artist:"Ricky Martin",    wrong:["Marc Anthony","Enrique Iglesias","Jon Secada"] },
    { title:"Macarena",           artist:"Los del Rio",     wrong:["Ricky Martin","Enrique Iglesias","Chayanne"] },
    { title:"La Bamba",           artist:"Los Lobos",       wrong:["Selena","Ricky Martin","Marc Anthony"] },
    { title:"Tubthumping",        artist:"Chumbawamba",     wrong:["Fatboy Slim","Prodigy","Chemical Brothers"] },
    { title:"Ironic",             artist:"Alanis Morissette", wrong:["Sheryl Crow","Alanis Morissette","Sarah McLachlan"] },
    { title:"You Oughta Know",    artist:"Alanis Morissette", wrong:["Fiona Apple","PJ Harvey","Liz Phair"] },
    { title:"Black Hole Sun",     artist:"Soundgarden",     wrong:["Pearl Jam","Alice in Chains","Stone Temple Pilots"] },
    { title:"Jeremy",             artist:"Pearl Jam",       wrong:["Soundgarden","Nirvana","Stone Temple Pilots"] },
    { title:"Losing My Religion", artist:"R.E.M.",          wrong:["The Cure","Depeche Mode","New Order"] },
    { title:"Creep",              artist:"Radiohead",       wrong:["Blur","Suede","Pulp"] },
    { title:"Common People",      artist:"Pulp",            wrong:["Blur","Elastica","Sleeper"] },
    { title:"Song 2",             artist:"Blur",            wrong:["Oasis","Pulp","Suede"] },
    { title:"Firestarter",        artist:"Prodigy",         wrong:["Chemical Brothers","Fatboy Slim","Underworld"] },
    { title:"Unfinished Sympathy",artist:"Massive Attack",  wrong:["Portishead","Tricky","Cocteau Twins"] },
    { title:"Smooth Criminal",    artist:"Michael Jackson", wrong:["Prince","James Brown","Boyz II Men"] },
    { title:"Baby Got Back",      artist:"Sir Mix-a-Lot",   wrong:["Snoop Dogg","Ice Cube","Dr. Dre"] },
    { title:"Return of the Mack", artist:"Mark Morrison",   wrong:["Craig David","Shaggy","UB40"] },
    { title:"Mr. Jones",          artist:"Counting Crows",  wrong:["Matchbox Twenty","Third Eye Blind","Fastball"] },
    { title:"Semi-Charmed Life",  artist:"Third Eye Blind", wrong:["Matchbox Twenty","Counting Crows","Gin Blossoms"] },
    { title:"Push",               artist:"Matchbox Twenty", wrong:["Third Eye Blind","Goo Goo Dolls","Counting Crows"] },
    { title:"Iris",               artist:"Goo Goo Dolls",   wrong:["Third Eye Blind","Matchbox Twenty","Barenaked Ladies"] },
    { title:"What's Up",         artist:"4 Non Blondes",    wrong:["Alanis Morissette","Sheryl Crow","Joan Osborne"] },
    { title:"Mysterious Girl",    artist:"Peter Andre",     wrong:["Craig David","Shaggy","Mark Morrison"] },
    { title:"Informer",           artist:"Snow",            wrong:["Shaggy","UB40","Inner Circle"] },
    { title:"Boom Shak-A-Lak",   artist:"Apache Indian",   wrong:["Shaggy","Snow","Ini Kamoze"] },
    { title:"Hot Hot Hot",        artist:"Arrow",           wrong:["Buster Poindexter","Harry Belafonte","Lord Kitchener"] },
    { title:"Mambo No. 5",        artist:"Lou Bega",        wrong:["Ricky Martin","Marc Anthony","Enrique Iglesias"] },
    { title:"La Isla Bonita",     artist:"Madonna",         wrong:["Shakira","Jennifer Lopez","Gloria Estefan"] },
    { title:"Ray of Light",       artist:"Madonna",         wrong:["Cher","Kylie Minogue","Annie Lennox"] },
    { title:"Everybody",          artist:"Backstreet Boys", wrong:["NSYNC","New Kids on the Block","98 Degrees"] },
    { title:"I Want It That Way", artist:"Backstreet Boys", wrong:["NSYNC","Boyz II Men","New Kids on the Block"] },
    { title:"Tearin' Up My Heart",artist:"NSYNC",           wrong:["Backstreet Boys","New Edition","Bobby Brown"] },
    { title:"I Believe I Can Fly",artist:"R. Kelly",        wrong:["Boyz II Men","Brian McKnight","Joe"] },
    { title:"End of the Road",    artist:"Boyz II Men",     wrong:["New Edition","R. Kelly","Brian McKnight"] },
    { title:"Fantasy",            artist:"Mariah Carey",    wrong:["Whitney Houston","Janet Jackson","TLC"] },
  ],
  rnb: [
    { title:"No Scrubs",          artist:"TLC",             wrong:["Destiny's Child","Brandy","Monica"] },
    { title:"Crazy in Love",      artist:"Beyoncé",         wrong:["Rihanna","Alicia Keys","Ciara"] },
    { title:"Yeah!",              artist:"Usher",           wrong:["Ne-Yo","Chris Brown","Mario"] },
    { title:"Ignition",           artist:"R. Kelly",        wrong:["Usher","Ne-Yo","Chris Brown"] },
    { title:"Crazy",              artist:"Gnarls Barkley",  wrong:["OutKast","Cee Lo Green","Bruno Mars"] },
    { title:"Umbrella",           artist:"Rihanna",         wrong:["Beyoncé","Ciara","Cassie"] },
    { title:"Diamonds",           artist:"Rihanna",         wrong:["Beyoncé","Alicia Keys","Mariah Carey"] },
    { title:"Love on Top",        artist:"Beyoncé",         wrong:["Alicia Keys","Mary J. Blige","Mariah Carey"] },
    { title:"Good Days",          artist:"SZA",             wrong:["H.E.R.","Jhené Aiko","Summer Walker"] },
    { title:"We Don't Talk Anymore", artist:"Charlie Puth", wrong:["Sam Smith","Shawn Mendes","James Arthur"] },
    { title:"Earned It",          artist:"The Weeknd",      wrong:["Miguel","Frank Ocean","Trey Songz"] },
    { title:"Often",              artist:"The Weeknd",      wrong:["Drake","PartyNextDoor","Nav"] },
    { title:"Come Through",       artist:"H.E.R.",          wrong:["Jhené Aiko","Summer Walker","SZA"] },
    { title:"Leave the Door Open",artist:"Bruno Mars",      wrong:["The Weeknd","Miguel","Daniel Caesar"] },
    { title:"Essence",            artist:"WizKid",          wrong:["Burna Boy","Afrobeats","Rema"] },
    { title:"Peaches",            artist:"Justin Bieber",   wrong:["Chris Brown","Trey Songz","Giveon"] },
    { title:"Hold On",            artist:"Justin Bieber",   wrong:["Chris Brown","Ne-Yo","Mario"] },
    { title:"Adorn",              artist:"Miguel",          wrong:["Frank Ocean","The Weeknd","Daniel Caesar"] },
    { title:"Novacane",           artist:"Frank Ocean",     wrong:["The Weeknd","Miguel","PARTYNEXTDOOR"] },
    { title:"Super Rich Kids",    artist:"Frank Ocean",     wrong:["Kendrick Lamar","Tyler the Creator","Earl Sweatshirt"] },
    { title:"Superstar",          artist:"Usher",           wrong:["Chris Brown","Ne-Yo","Trey Songz"] },
    { title:"Nice & Slow",        artist:"Usher",           wrong:["Keith Sweat","R. Kelly","Babyface"] },
    { title:"Confessions Part II",artist:"Usher",           wrong:["Chris Brown","Mario","Omarion"] },
    { title:"I Wanna Be with You",artist:"Mandy Moore",     wrong:["Christina Aguilera","Brandy","Monica"] },
    { title:"The Boy Is Mine",    artist:"Brandy & Monica", wrong:["Mariah & Whitney","TLC","En Vogue"] },
    { title:"Angel",              artist:"Shaggy",          wrong:["Craig David","Mark Morrison","UB40"] },
    { title:"It Wasn't Me",       artist:"Shaggy",          wrong:["Craig David","Mark Morrison","Sean Paul"] },
    { title:"Fill Me In",         artist:"Craig David",     wrong:["Mark Morrison","Shaggy","UB40"] },
    { title:"Issues",             artist:"Julia Michaels",  wrong:["Alessia Cara","Demi Lovato","Halsey"] },
    { title:"Skin",               artist:"Rihanna",         wrong:["Beyoncé","Ciara","Tinashe"] },
    { title:"Wild Thoughts",      artist:"DJ Khaled",       wrong:["Chris Brown","Usher","Ne-Yo"] },
    { title:"For Free",           artist:"DJ Khaled",       wrong:["Drake","Future","Lil Wayne"] },
    { title:"We Found Love",      artist:"Rihanna",         wrong:["Beyoncé","Ciara","Cassie"] },
    { title:"All of the Lights",  artist:"Kanye West",      wrong:["Jay-Z","John Legend","The Weeknd"] },
    { title:"Slow Motion",        artist:"Trey Songz",      wrong:["Chris Brown","Ne-Yo","Mario"] },
    { title:"Neighbors Know My Name", artist:"Trey Songz",  wrong:["Chris Brown","Usher","Tank"] },
    { title:"Deja Vu",            artist:"Beyoncé",         wrong:["Alicia Keys","Mary J. Blige","Jennifer Hudson"] },
    { title:"Cater 2 U",          artist:"Destiny's Child", wrong:["TLC","En Vogue","SWV"] },
    { title:"Say My Name",        artist:"Destiny's Child", wrong:["TLC","En Vogue","Brandy"] },
    { title:"Survivor",           artist:"Destiny's Child", wrong:["TLC","En Vogue","SWV"] },
    { title:"Before I Let Go",    artist:"Beyoncé",         wrong:["Mary J. Blige","Jennifer Hudson","Ledisi"] },
    { title:"Middle Child",       artist:"J. Cole",         wrong:["Kendrick Lamar","Drake","Big Sean"] },
    { title:"MIDDLE CHILD",       artist:"J. Cole",         wrong:["Dreamville","Bas","Omen"] },
    { title:"Blessed",            artist:"Daniel Caesar",   wrong:["H.E.R.","Giveon","Lucky Daye"] },
    { title:"Sativa",             artist:"Jhené Aiko",      wrong:["SZA","H.E.R.","Summer Walker"] },
    { title:"None of Your Concern", artist:"Big Sean",      wrong:["Jhené Aiko","SZA","H.E.R."] },
    { title:"Slow Burn",          artist:"Kacey Musgraves", wrong:["Maren Morris","Carly Pearce","Cam"] },
    { title:"This Is America",    artist:"Childish Gambino",wrong:["Kendrick Lamar","J. Cole","Drake"] },
    { title:"Redbone",            artist:"Childish Gambino",wrong:["Frank Ocean","Miguel","The Weeknd"] },
    { title:"Tennessee Whiskey",  artist:"Chris Stapleton", wrong:["Luke Bryan","Blake Shelton","Jason Aldean"] },
    { title:"Pillowtalk",         artist:"ZAYN",            wrong:["Harry Styles","Niall Horan","Liam Payne"] },
  ],
  inter: [
    { title:"Shape of You",       artist:"Ed Sheeran",      wrong:["Sam Smith","James Arthur","Charlie Puth"] },
    { title:"Despacito",          artist:"Luis Fonsi",      wrong:["J Balvin","Bad Bunny","Maluma"] },
    { title:"Gangnam Style",      artist:"PSY",             wrong:["CL","G-Dragon","Big Bang"] },
    { title:"Blinding Lights",    artist:"The Weeknd",      wrong:["Drake","Post Malone","Bruno Mars"] },
    { title:"Someone You Loved",  artist:"Lewis Capaldi",   wrong:["James Arthur","Calum Scott","James Bay"] },
    { title:"Happier",            artist:"Marshmello",      wrong:["Kygo","Avicii","Martin Garrix"] },
    { title:"Shallow",            artist:"Lady Gaga",       wrong:["Adele","P!nk","Demi Lovato"] },
    { title:"Old Town Road",      artist:"Lil Nas X",       wrong:["Billy Ray Cyrus","Kane Brown","Darius Rucker"] },
    { title:"Rockstar",           artist:"Post Malone",     wrong:["Juice WRLD","XXXTentacion","Lil Uzi Vert"] },
    { title:"Sunflower",          artist:"Post Malone",     wrong:["Swae Lee","Travis Scott","Lil Baby"] },
    { title:"God's Plan",         artist:"Drake",           wrong:["Travis Scott","Future","Young Thug"] },
    { title:"Havana",             artist:"Camila Cabello",  wrong:["Shakira","Jennifer Lopez","Selena Gomez"] },
    { title:"I Like It",          artist:"Cardi B",         wrong:["Nicki Minaj","City Girls","Doja Cat"] },
    { title:"Bodak Yellow",       artist:"Cardi B",         wrong:["Nicki Minaj","City Girls","Saweetie"] },
    { title:"HUMBLE.",            artist:"Kendrick Lamar",  wrong:["J. Cole","Drake","Big Sean"] },
    { title:"Bad and Boujee",     artist:"Migos",           wrong:["Quality Control","Rich the Kid","Lil Yachty"] },
    { title:"XO Tour Llif3",      artist:"Lil Uzi Vert",    wrong:["Juice WRLD","Polo G","Rod Wave"] },
    { title:"Lucid Dreams",       artist:"Juice WRLD",      wrong:["Lil Uzi Vert","Trippie Redd","XXXTentacion"] },
    { title:"SAD!",               artist:"XXXTentacion",    wrong:["Juice WRLD","Lil Uzi Vert","Trippie Redd"] },
    { title:"Sicko Mode",         artist:"Travis Scott",    wrong:["Drake","Future","Young Thug"] },
    { title:"HIGHEST IN THE ROOM",artist:"Travis Scott",    wrong:["Drake","Lil Baby","Young Thug"] },
    { title:"Drip Too Hard",      artist:"Lil Baby",        wrong:["Gunna","Young Thug","Lil Durk"] },
    { title:"Congratulations",    artist:"Post Malone",     wrong:["Lil Uzi Vert","Juice WRLD","Trippie Redd"] },
    { title:"Lean On",            artist:"Major Lazer",     wrong:["Calvin Harris","Kygo","Avicii"] },
    { title:"Wake Me Up",         artist:"Avicii",          wrong:["Kygo","Zedd","Martin Garrix"] },
    { title:"Animals",            artist:"Martin Garrix",   wrong:["Hardwell","Tiësto","Afrojack"] },
    { title:"Feel So Close",      artist:"Calvin Harris",   wrong:["Avicii","Kygo","Zedd"] },
    { title:"Faded",              artist:"Alan Walker",     wrong:["Martin Garrix","Kygo","Avicii"] },
    { title:"Closer",             artist:"The Chainsmokers",wrong:["Marshmello","Illenium","Kygo"] },
    { title:"Don't Let Me Down",  artist:"The Chainsmokers",wrong:["Marshmello","Kygo","Illenium"] },
    { title:"Stressed Out",       artist:"Twenty One Pilots",wrong:["Imagine Dragons","Fall Out Boy","Panic! at the Disco"] },
    { title:"Thunder",            artist:"Imagine Dragons", wrong:["Twenty One Pilots","OneRepublic","Bastille"] },
    { title:"Natural",            artist:"Imagine Dragons", wrong:["Twenty One Pilots","OneRepublic","Panic! at the Disco"] },
    { title:"Believer",           artist:"Imagine Dragons", wrong:["OneRepublic","Bastille","Twenty One Pilots"] },
    { title:"Radioactive",        artist:"Imagine Dragons", wrong:["Muse","Coldplay","Linkin Park"] },
    { title:"Don't You Worry Child", artist:"Swedish House Mafia", wrong:["Avicii","Calvin Harris","Tiësto"] },
    { title:"Sweet Nothing",      artist:"Calvin Harris",   wrong:["Avicii","Kygo","Zedd"] },
    { title:"Power",              artist:"Kanye West",      wrong:["Jay-Z","Big Sean","Kid Cudi"] },
    { title:"GOAT",               artist:"Burna Boy",       wrong:["WizKid","Davido","Rema"] },
    { title:"Last Last",          artist:"Burna Boy",       wrong:["WizKid","Davido","Afrobeats"] },
    { title:"Love Nwantiti",      artist:"CKay",            wrong:["Fireboy DML","Omah Lay","Kizz Daniel"] },
    { title:"Jerusalema",         artist:"Master KG",       wrong:["Nomcebo Zikode","Busiswa","Mafikizolo"] },
    { title:"Astronaut in the Ocean", artist:"Masked Wolf", wrong:["Powfu","Joyner Lucas","Tom MacDonald"] },
    { title:"Beggin",             artist:"Maneskin",        wrong:["Imagine Dragons","The Killers","Arctic Monkeys"] },
    { title:"Zitti e buoni",      artist:"Maneskin",        wrong:["Imagine Dragons","The Killers","Franz Ferdinand"] },
    { title:"Riptide",            artist:"Vance Joy",       wrong:["James Bay","Tom Odell","Hozier"] },
    { title:"Take Me to Church",  artist:"Hozier",          wrong:["James Bay","Tom Odell","Vance Joy"] },
    { title:"Let Her Go",         artist:"Passenger",       wrong:["James Bay","Hozier","Tom Odell"] },
    { title:"Budapest",           artist:"George Ezra",     wrong:["James Bay","Hozier","Vance Joy"] },
    { title:"Hold Back the River",artist:"James Bay",       wrong:["Hozier","George Ezra","Passenger"] },
  ],
}

type Phase = "category" | "playing" | "reveal" | "distribute" | "finished"

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function BlindTest({ members, myUserId, onAwardDistance, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("category")
  const [category, setCategory] = useState("")
  const [questions, setQuestions] = useState<any[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [choices, setChoices] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(20)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [fastest, setFastest] = useState<string | null>(null)
  const [fastestTime, setFastestTime] = useState<number | null>(null)
  const [startTime, setStartTime] = useState<number>(0)
  const [distributeTarget, setDistributeTarget] = useState<string | null>(null)
  const [ytId, setYtId] = useState<string>("")
  const [loadingYt, setLoadingYt] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const wasPlaying = useRef(false)

  // Stop ambiance au montage, relance à la fermeture
  useEffect(() => {
    wasPlaying.current = isAmbiancePlaying()
    if (wasPlaying.current) stopAmbiance()
    return () => {
      if (wasPlaying.current) {
        const vol = getSavedVolume()
        const muted = getSavedMuted()
        if (!muted) startAmbiance(vol)
      }
    }
  }, [])

  const q = questions[qIndex]
  const isMe = myUserId === myUserId // toujours true — on garde local pour l'instant

  const startCategory = (catId: string) => {
    const pool = SONGS[catId]
    const picked = shuffle(pool).slice(0, 10)
    setCategory(catId)
    setQuestions(picked)
    setQIndex(0)
    setScores({})
    setPhase("playing")
    launchQuestion(picked[0])
  }

  const launchQuestion = async (question: any) => {
    const allChoices = shuffle([question.artist, ...question.wrong])
    setChoices(allChoices)
    setSelected(null)
    setFastest(null)
    setFastestTime(null)
    setYtId("")
    setTimeLeft(20)
    setStartTime(Date.now())
    // Charger l'ID YouTube
    setLoadingYt(true)
    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(question.title + ' ' + question.artist + ' official audio')}`)
      const data = await res.json()
      setYtId(data.id || "")
    } catch {}
    setLoadingYt(false)
  }

  // Timer
  useEffect(() => {
    if (phase !== "playing") return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          setPhase("reveal")
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [phase, qIndex])

  const handleChoice = (choice: string) => {
    if (selected) return
    setSelected(choice)
    clearInterval(timerRef.current!)
    const elapsed = (Date.now() - startTime) / 1000
    const correct = choice === q.artist

    if (correct) {
      setFastest(myUserId)
      setFastestTime(elapsed)
      setScores(s => ({ ...s, [myUserId]: (s[myUserId] || 0) + 1 }))
    }

    setTimeout(() => setPhase("reveal"), 800)
  }

  const next = () => {
    const nextIdx = qIndex + 1
    if (nextIdx >= questions.length) {
      setPhase("finished")
      return
    }
    setQIndex(nextIdx)
    setPhase("playing")
    launchQuestion(questions[nextIdx])
  }

  const handleDistribute = (targetId: string) => {
    setDistributeTarget(targetId)
    onAwardDistance(targetId, -20) // pénalité = 2 gorgées
    setTimeout(() => {
      setDistributeTarget(null)
      next()
    }, 1500)
  }

  const catInfo = CATEGORIES.find(c => c.id === category)
  const myScore = scores[myUserId] || 0
  const iAmFastest = fastest === myUserId

  const BG: any = { position:"fixed", inset:0, background:"#0a0a14", zIndex:400, display:"flex", flexDirection:"column", alignItems:"center", overflowY:"auto", padding:"28px 20px 40px" }

  // ── CATÉGORIE ──
  if (phase === "category") return (
    <div style={BG}>
      <div style={{ width:"100%", maxWidth:360 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            🎵 BLIND TEST
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:13, letterSpacing:3, color:"#4b5563", marginBottom:16 }}>— CHOISIS UNE CATÉGORIE —</div>

        <div style={{ display:"flex", flexDirection:"column" as const, gap:10 }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => startCategory(cat.id)}
              style={{ padding:"18px 20px", borderRadius:16, border:"1px solid #1e1e2e", cursor:"pointer", background:"#13131f", display:"flex", alignItems:"center", gap:14, width:"100%" }}
              onTouchStart={e => (e.currentTarget.style.background="#1a1030")}
              onTouchEnd={e => (e.currentTarget.style.background="#13131f")}
            >
              <span style={{ fontSize:28 }}>{cat.emoji}</span>
              <div style={{ textAlign:"left" as const }}>
                <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:18, letterSpacing:2, color:"#e2e8f0" }}>{cat.label}</div>
                <div style={{ fontSize:11, color:"#4b5563", marginTop:2 }}>10 questions • 20s par question</div>
              </div>
              <span style={{ marginLeft:"auto", color:"#374151", fontSize:18 }}>›</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop:16, padding:14, borderRadius:12, background:"#13131f", border:"1px solid #1e1e2e", fontSize:12, color:"#4b5563", lineHeight:1.6 }}>
          🏆 Le plus rapide à trouver la réponse distribue <strong style={{ color:"#c084fc" }}>2 gorgées</strong> au joueur de son choix
        </div>
      </div>
    </div>
  )

  // ── PLAYING ──
  if (phase === "playing" && q) return (
    <div style={BG}>
      <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:16 }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            {catInfo?.emoji} {catInfo?.label}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>

        {/* Stats */}
        <div style={{ display:"flex", gap:8 }}>
          <div style={{ flex:1, background:"#13131f", border:"1px solid #1e1e2e", borderRadius:12, padding:"8px 12px" }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:18, color:"#c084fc" }}>{qIndex+1}/10</div>
            <div style={{ fontSize:9, color:"#4b5563", fontWeight:700, letterSpacing:1 }}>QUESTION</div>
          </div>
          <div style={{ flex:1, background:"#13131f", border:"1px solid #1e1e2e", borderRadius:12, padding:"8px 12px" }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:18, color:"#4ade80" }}>{myScore}</div>
            <div style={{ fontSize:9, color:"#4b5563", fontWeight:700, letterSpacing:1 }}>BONNES RÉP.</div>
          </div>
          <div style={{ flex:1, background: timeLeft <= 5 ? "#1c0505" : "#13131f", border:`1px solid ${timeLeft <= 5 ? "#7f1d1d" : "#1e1e2e"}`, borderRadius:12, padding:"8px 12px" }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:18, color: timeLeft <= 5 ? "#f87171" : "#f59e0b" }}>{timeLeft}s</div>
            <div style={{ fontSize:9, color:"#4b5563", fontWeight:700, letterSpacing:1 }}>TEMPS</div>
          </div>
        </div>

        {/* Vinyle */}
        <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:12 }}>
          <div style={{ position:"relative", width:140, height:140 }}>
            {/* Timer ring */}
            <div style={{ position:"absolute", inset:-6, borderRadius:"50%", border:"3px solid transparent", borderTopColor:"#c084fc", borderRightColor:"#c084fc", animation:"spin 1s linear infinite", boxShadow:"0 0 12px #c084fc44" }}/>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes eq{from{height:4px}to{height:var(--h)}}`}</style>
            <div style={{ width:140, height:140, borderRadius:"50%", background:"radial-gradient(circle,#1a1a2e 0%,#1a1a2e 18%,#0d0d18 18%,#0d0d18 21%,#1a1a2e 21%,#1a1a2e 36%,#0d0d18 36%,#0d0d18 39%,#1a1a2e 39%,#100%)", border:"2px solid #2a2a3e", display:"flex", alignItems:"center", justifyContent:"center", animation:"spin 3s linear infinite", boxShadow:"0 0 30px #a855f722" }}>
              <div style={{ width:42, height:42, borderRadius:"50%", background:"#13131f", border:"2px solid #2a2a3e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, animation:"spin 3s linear infinite reverse" }}>🎵</div>
            </div>
          </div>
          {/* EQ */}
          <div style={{ display:"flex", gap:3, alignItems:"flex-end", height:24 }}>
            {[18,24,12,22,16,26,14,20,18,22].map((h,i) => (
              <div key={i} style={{ width:5, borderRadius:3, background:"linear-gradient(to top,#a855f7,#ec4899)", height:h, animation:`eq ${0.3+i*0.05}s ease-in-out infinite alternate`, opacity:0.8 }}/>
            ))}
          </div>
          {/* Player YouTube caché — audio uniquement */}
          {ytId && (
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0&start=30&mute=0`}
              style={{ width:1, height:1, opacity:0, pointerEvents:"none", position:"absolute" }}
              allow="autoplay"
            />
          )}
          {loadingYt && (
            <div style={{ fontSize:11, color:"#4b5563", letterSpacing:1 }}>🎵 Chargement...</div>
          )}
        </div>

        {/* Titre chanson (caché) */}
        <div style={{ background:"#13131f", borderRadius:14, border:"1px solid #1e1e2e", padding:"14px 16px", textAlign:"center" as const }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:11, color:"#4b5563", letterSpacing:2, marginBottom:6 }}>TITRE DE LA CHANSON</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, color:"#e2e8f0", letterSpacing:2 }}>{q.title}</div>
          <div style={{ fontSize:11, color:"#6b7280", marginTop:4 }}>Qui est l'artiste ?</div>
        </div>

        {/* Choix */}
        <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
          {choices.map((choice, i) => {
            const isSelected = selected === choice
            const bg = isSelected ? "#1a1030" : "#13131f"
            const border = isSelected ? "#a855f7" : "#1e1e2e"
            const color = isSelected ? "#c084fc" : "#e2e8f0"
            return (
              <button key={i} onClick={() => handleChoice(choice)} disabled={!!selected}
                style={{ padding:"14px 16px", borderRadius:14, border:`2px solid ${border}`, cursor:selected?"not-allowed":"pointer", background:bg, display:"flex", alignItems:"center", gap:12, width:"100%", transition:"all 0.15s" }}>
                <div style={{ width:28, height:28, borderRadius:8, background: isSelected?"#3b1f6a":"#1e1e2e", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',cursive", fontSize:14, color: isSelected?"#c084fc":"#6b7280", flexShrink:0 }}>
                  {["A","B","C","D"][i]}
                </div>
                <div style={{ fontSize:13, fontWeight:700, color, textAlign:"left" as const, flex:1 }}>{choice}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  // ── REVEAL ──
  if (phase === "reveal" && q) {
    const correct = selected === q.artist
    return (
      <div style={BG}>
        <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              {catInfo?.emoji} {catInfo?.label}
            </div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:14, color:"#4b5563", letterSpacing:1 }}>{qIndex+1}/10</div>
          </div>

          {/* Résultat */}
          <div style={{ textAlign:"center" as const, padding:"20px", borderRadius:18, background: correct?"#052e16":"#1c0505", border:`1px solid ${correct?"#166534":"#7f1d1d"}` }}>
            <div style={{ fontSize:40, marginBottom:8 }}>{correct?"✅":"❌"}</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, color: correct?"#4ade80":"#f87171", letterSpacing:3 }}>
              {correct ? "BONNE RÉPONSE !" : (selected ? "RATÉ !" : "TEMPS ÉCOULÉ !")}
            </div>
            <div style={{ fontSize:14, color: correct?"#86efac":"#fca5a5", marginTop:6 }}>
              {q.artist} — {q.title}
            </div>
          </div>

          {/* Choix révélés */}
          <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
            {choices.map((choice, i) => {
              const isCorrect = choice === q.artist
              const isWrong = choice === selected && !isCorrect
              return (
                <div key={i} style={{ padding:"12px 16px", borderRadius:14, border:`2px solid ${isCorrect?"#166534":isWrong?"#7f1d1d":"#1e1e2e"}`, background: isCorrect?"#052e16":isWrong?"#1c0505":"#13131f", display:"flex", alignItems:"center", gap:12, opacity: (!isCorrect && !isWrong) ? 0.5 : 1 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background: isCorrect?"#166534":isWrong?"#7f1d1d":"#1e1e2e", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',cursive", fontSize:14, color: isCorrect?"#4ade80":isWrong?"#f87171":"#6b7280", flexShrink:0 }}>
                    {["A","B","C","D"][i]}
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color: isCorrect?"#4ade80":isWrong?"#f87171":"#9ca3af", flex:1 }}>{choice}</div>
                  {isCorrect && <span>✅</span>}
                  {isWrong && <span>❌</span>}
                </div>
              )
            })}
          </div>

          {/* Si correct → distribuer */}
          {correct && (
            <div style={{ background:"#1a1030", borderRadius:14, border:"1px solid #3b1f6a", padding:"14px 16px" }}>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:14, color:"#c084fc", letterSpacing:2, marginBottom:12 }}>🏆 T'ES LE PLUS RAPIDE — DISTRIBUE 2 GORGÉES !</div>
              <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
                {members.filter(m => m.user_id !== myUserId).map(m => (
                  <button key={m.user_id} onClick={() => handleDistribute(m.user_id)}
                    style={{ padding:"12px 16px", borderRadius:12, border:"1px solid #3b1f6a", cursor:"pointer", background: distributeTarget===m.user_id?"#2d1060":"#13131f", display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:20 }}>{m.avatar_emoji || "🍺"}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:"#e2e8f0", flex:1, textAlign:"left" as const }}>{m.pseudo}</span>
                    <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:13, color:"#c084fc" }}>2 GORGÉES →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bouton suivant si pas correct */}
          {!correct && (
            <button onClick={next}
              style={{ width:"100%", padding:"15px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontFamily:"'Bebas Neue',cursive", fontSize:17, letterSpacing:2 }}>
              {qIndex+1 >= questions.length ? "VOIR LE SCORE →" : "QUESTION SUIVANTE →"}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── FINISHED ──
  if (phase === "finished") {
    const sortedMembers = [...members].sort((a, b) => (scores[b.user_id]||0) - (scores[a.user_id]||0))
    return (
      <div style={BG}>
        <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:14 }}>
          <div style={{ textAlign:"center" as const, padding:"24px 20px", borderRadius:18, background:"#13131f", border:"1px solid #2a2a3e" }}>
            <div style={{ fontSize:40, marginBottom:8 }}>🏆</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, color:"#c084fc", letterSpacing:3 }}>FIN DU BLIND TEST !</div>
            <div style={{ fontSize:13, color:"#6b7280", marginTop:6 }}>{catInfo?.emoji} {catInfo?.label}</div>
          </div>

          {/* Classement */}
          <div style={{ background:"#13131f", borderRadius:16, border:"1px solid #1e1e2e", overflow:"hidden" }}>
            {sortedMembers.map((m, i) => (
              <div key={m.user_id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:i<sortedMembers.length-1?"1px solid #1e1e2e":"none", background: m.user_id===myUserId?"#1a1030":"transparent" }}>
                <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, color:["#f59e0b","#9ca3af","#cd7f32"][i]||"#4b5563", width:24 }}>{["🥇","🥈","🥉"][i]||`${i+1}`}</div>
                <span style={{ fontSize:20 }}>{m.avatar_emoji||"🍺"}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color: m.user_id===myUserId?"#c084fc":"#e2e8f0" }}>{m.pseudo}</div>
                </div>
                <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:18, color:"#4ade80" }}>{scores[m.user_id]||0}/10</div>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => { setPhase("category"); setQuestions([]); setQIndex(0); setScores({}) }}
              style={{ flex:1, padding:"14px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontFamily:"'Bebas Neue',cursive", fontSize:15, letterSpacing:2 }}>
              🔄 REJOUER
            </button>
            <button onClick={onClose}
              style={{ flex:1, padding:"14px", borderRadius:14, border:"1px solid #2a2a3e", cursor:"pointer", background:"transparent", color:"#6b7280", fontFamily:"'Bebas Neue',cursive", fontSize:15, letterSpacing:2 }}>
              FERMER
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
