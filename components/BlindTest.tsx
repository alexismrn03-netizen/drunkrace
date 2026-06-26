"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase"
import { stopAmbiance, startAmbiance, isAmbiancePlaying } from "@/lib/ambiance"
import { getSavedVolume, getSavedMuted } from "@/lib/theme"

interface Props {
  members: any[]
  myUserId: string
  groupId: string
  onAwardDistance: (userId: string, delta: number) => void
  onClose: () => void
}

const CATEGORIES = [
  { id: "rap_fr",  label: "Rap FR",            emoji: "🎤" },
  { id: "pop",     label: "Pop",               emoji: "🎵" },
  { id: "2000s",   label: "Années 2000",        emoji: "📼" },
  { id: "90s",     label: "Années 90",          emoji: "🕺" },
  { id: "rnb",     label: "RnB",               emoji: "🔥" },
  { id: "inter",   label: "Hits Internationaux",emoji: "🌍" },
]

const SONGS: Record<string, {title:string; artist:string; wrong:[string,string,string]}[]> = {
  rap_fr: [
    { title:"Validé",              artist:"Booba",           wrong:["Freeze Corleone","SCH","Ninho"] },
    { title:"Tout va bien",        artist:"Orelsan",         wrong:["Bigflo & Oli","Vianney","Nekfeu"] },
    { title:"Bande organisée",     artist:"Jul",             wrong:["SCH","Soso Maness","Niro"] },
    { title:"Nuit 17 à 52",        artist:"Orelsan",         wrong:["Nekfeu","Lomepal","Roméo Elvis"] },
    { title:"Bloqué",              artist:"Soolking",        wrong:["Ninho","Niska","Awa Imani"] },
    { title:"Djadja",              artist:"Aya Nakamura",    wrong:["Amel Bent","Vitaa","Wejdene"] },
    { title:"Woah",                artist:"Niska",           wrong:["Ninho","Awa Imani","Leto"] },
    { title:"Fuego",               artist:"Soprano",         wrong:["Alonzo","Jul","Soso Maness"] },
    { title:"Lemon",               artist:"Nekfeu",          wrong:["Orelsan","Lomepal","Roméo Elvis"] },
    { title:"Si t'as l'amour",     artist:"Soso Maness",     wrong:["Niro","Alonzo","Julien Doré"] },
    { title:"Freestyle Caraïbes",  artist:"Damso",           wrong:["Hamza","Roméo Elvis","Lomepal"] },
    { title:"Sur ma route",        artist:"Black M",         wrong:["Maître Gims","Awa Imani","Soolking"] },
    { title:"Bella",               artist:"Maître Gims",     wrong:["Awa Imani","Naps","Alonzo"] },
    { title:"Aïcha",               artist:"Khaled",          wrong:["Cheb Mami","Stromae","Magic System"] },
    { title:"Nouveau Gabon",       artist:"MHD",             wrong:["Black M","Maître Gims","Awa Imani"] },
    { title:"Merci",               artist:"BigFlo & Oli",    wrong:["Orelsan","Vianney","Nekfeu"] },
    { title:"Rouleau compresseur", artist:"Kaaris",          wrong:["Booba","SCH","Lacrim"] },
    { title:"Médicament",          artist:"Lomepal",         wrong:["Orelsan","Roméo Elvis","Bagarre"] },
    { title:"Longévité",           artist:"Zola",            wrong:["Ninho","Maes","Freeze Corleone"] },
    { title:"Garde la pêche",      artist:"Vald",            wrong:["Orelsan","Gringe","Eddy de Pretto"] },
    { title:"Dans la légende",     artist:"PNL",             wrong:["Freeze Corleone","Maes","Zola"] },
    { title:"Que la famille",      artist:"PNL",             wrong:["Maes","Ninho","Damso"] },
    { title:"Au DD",               artist:"PNL",             wrong:["Freeze Corleone","Zola","Ninho"] },
    { title:"Pianos",              artist:"Hamza",           wrong:["Damso","Nekfeu","Lomepal"] },
    { title:"Pétrouchka",          artist:"Booba",           wrong:["Kaaris","Lacrim","Sadek"] },
    { title:"Happy End",           artist:"Roméo Elvis",     wrong:["Lomepal","Eddy de Pretto","Bon Entendeur"] },
    { title:"Quand c'est",         artist:"Stromae",         wrong:["Vianney","Orelsan","Julien Doré"] },
    { title:"Chocolat",            artist:"Naps",            wrong:["Alonzo","Jul","Soso Maness"] },
    { title:"Sale temps",          artist:"Lacrim",          wrong:["Booba","Kaaris","SCH"] },
    { title:"J'suis QLF",          artist:"Youssoupha",      wrong:["Soprano","Kery James","Oxmo Puccino"] },
    { title:"Mowgli",              artist:"Vald",            wrong:["Orelsan","Gringe","Ikbenefarhan"] },
    { title:"Freestyle Grünt",     artist:"Freeze Corleone", wrong:["Zola","Ninho","Maes"] },
    { title:"Destinée",            artist:"Maes",            wrong:["Freeze Corleone","Ninho","Zola"] },
    { title:"Allez",               artist:"Sofiane",         wrong:["Ninho","Kalash Criminel","Maes"] },
    { title:"Jackpot",             artist:"Kalash Criminel", wrong:["Kaaris","Booba","SCH"] },
    { title:"Autopsie",            artist:"Leto",            wrong:["Zola","Ninho","Maes"] },
    { title:"Caillera pour la vie",artist:"Alonzo",          wrong:["Soso Maness","Jul","Naps"] },
    { title:"Madrina",             artist:"Awa Imani",       wrong:["Vitaa","Yseult","Imany"] },
    { title:"L'hymne de nos campagnes",artist:"Tryo",        wrong:["Massilia Sound System","La Ruda","Zebda"] },
    { title:"Éclipse",             artist:"SCH",             wrong:["Booba","Kaaris","Niro"] },
    { title:"Bombe atomique",      artist:"Awa Imani",       wrong:["Nicki Minaj","Cardi B","Shayri"] },
    { title:"Meurtre par effraction",artist:"Nekfeu",        wrong:["Lomepal","Orelsan","Roméo Elvis"] },
    { title:"Réseaux",             artist:"Awa Imani",       wrong:["Vitaa","Slimane","Wejdene"] },
    { title:"Papillon",            artist:"Wejdene",         wrong:["Awa Imani","Vitaa","Yseult"] },
    { title:"Madame Pavoshnikov",  artist:"Lomepal",         wrong:["Orelsan","Népal","Eddy de Pretto"] },
    { title:"Éclipse",             artist:"Sch",             wrong:["Booba","Kaaris","Niro"] },
    { title:"Till I Collapse",     artist:"Eminem",          wrong:["50 Cent","Dr. Dre","Jay-Z"] },
    { title:"Slow Motion",         artist:"Trey Songz",      wrong:["Chris Brown","Ne-Yo","Mario"] },
    { title:"Chocolat",            artist:"Awa Imani",       wrong:["Niska","MHD","Soolking"] },
    { title:"Billie Jean",         artist:"Ninho",           wrong:["Booba","Kaaris","Sadek"] },
  ],
  pop: [
    { title:"Shape of You",           artist:"Ed Sheeran",      wrong:["Sam Smith","Charlie Puth","James Arthur"] },
    { title:"Blinding Lights",        artist:"The Weeknd",      wrong:["Drake","Post Malone","Bruno Mars"] },
    { title:"Bad Guy",                artist:"Billie Eilish",   wrong:["Olivia Rodrigo","Ariana Grande","Dua Lipa"] },
    { title:"Levitating",             artist:"Dua Lipa",        wrong:["Lizzo","Cardi B","Normani"] },
    { title:"Stay",                   artist:"Justin Bieber",   wrong:["The Kid LAROI","Post Malone","Machine Gun Kelly"] },
    { title:"Watermelon Sugar",       artist:"Harry Styles",    wrong:["Niall Horan","Liam Payne","Louis Tomlinson"] },
    { title:"Drivers License",        artist:"Olivia Rodrigo",  wrong:["Billie Eilish","Ariana Grande","Sabrina Carpenter"] },
    { title:"good 4 u",               artist:"Olivia Rodrigo",  wrong:["Dua Lipa","Ava Max","Halsey"] },
    { title:"Heat Waves",             artist:"Glass Animals",   wrong:["Arctic Monkeys","Tame Impala","Jungle"] },
    { title:"As It Was",              artist:"Harry Styles",    wrong:["Ed Sheeran","Sam Smith","Shawn Mendes"] },
    { title:"Anti-Hero",              artist:"Taylor Swift",    wrong:["Sabrina Carpenter","Olivia Rodrigo","Gracie Abrams"] },
    { title:"Flowers",                artist:"Miley Cyrus",     wrong:["Dua Lipa","Ariana Grande","Selena Gomez"] },
    { title:"Unholy",                 artist:"Sam Smith",       wrong:["Kim Petras","Ava Max","Troye Sivan"] },
    { title:"About Damn Time",        artist:"Lizzo",           wrong:["Dua Lipa","Meghan Trainor","Kesha"] },
    { title:"Break My Soul",          artist:"Beyoncé",         wrong:["Rihanna","Destiny's Child","Ciara"] },
    { title:"Running Up That Hill",   artist:"Kate Bush",       wrong:["Annie Lennox","Sinéad O'Connor","Pat Benatar"] },
    { title:"Easy On Me",             artist:"Adele",           wrong:["Sam Smith","Lewis Capaldi","James Arthur"] },
    { title:"Vampire",                artist:"Olivia Rodrigo",  wrong:["Billie Eilish","Gracie Abrams","Sabrina Carpenter"] },
    { title:"Cruel Summer",           artist:"Taylor Swift",    wrong:["Katy Perry","Dua Lipa","Ava Max"] },
    { title:"Uptown Funk",            artist:"Bruno Mars",      wrong:["Mark Ronson","Pharrell","Usher"] },
    { title:"Someone Like You",       artist:"Adele",           wrong:["Amy Winehouse","Duffy","Jessie J"] },
    { title:"Rolling in the Deep",    artist:"Adele",           wrong:["Beyoncé","Alicia Keys","Mary J. Blige"] },
    { title:"Thinking Out Loud",      artist:"Ed Sheeran",      wrong:["Sam Smith","John Legend","Bruno Mars"] },
    { title:"Perfect",                artist:"Ed Sheeran",      wrong:["John Legend","Bruno Mars","James Arthur"] },
    { title:"Señorita",               artist:"Shawn Mendes",    wrong:["Camila Cabello","Justin Bieber","Selena Gomez"] },
    { title:"Havana",                 artist:"Camila Cabello",  wrong:["Selena Gomez","Shakira","Jennifer Lopez"] },
    { title:"Despacito",              artist:"Luis Fonsi",      wrong:["J Balvin","Bad Bunny","Maluma"] },
    { title:"Lean On",                artist:"Major Lazer",     wrong:["Calvin Harris","Kygo","Avicii"] },
    { title:"Can't Stop the Feeling", artist:"Justin Timberlake",wrong:["Bruno Mars","Pharrell","Mark Ronson"] },
    { title:"Shake It Off",           artist:"Taylor Swift",    wrong:["Katy Perry","Meghan Trainor","Carly Rae Jepsen"] },
    { title:"Pompeii",                artist:"Bastille",        wrong:["Imagine Dragons","Coldplay","OneRepublic"] },
    { title:"Love Story",             artist:"Taylor Swift",    wrong:["Selena Gomez","Demi Lovato","Miley Cyrus"] },
    { title:"Dynamite",               artist:"BTS",             wrong:["Blackpink","TWICE","EXO"] },
    { title:"Golden Hour",            artist:"JVKE",            wrong:["Conan Gray","Cian Ducrot","Stephen Sanchez"] },
    { title:"Kill Bill",              artist:"SZA",             wrong:["H.E.R.","Jhené Aiko","Summer Walker"] },
    { title:"Die For You",            artist:"The Weeknd",      wrong:["Drake","Nav","PartyNextDoor"] },
    { title:"Industry Baby",          artist:"Lil Nas X",       wrong:["Jack Harlow","Doja Cat","Tyler the Creator"] },
    { title:"Butter",                 artist:"BTS",             wrong:["NCT 127","Stray Kids","SEVENTEEN"] },
    { title:"Montero",                artist:"Lil Nas X",       wrong:["Doja Cat","Cardi B","Saweetie"] },
    { title:"Photograph",             artist:"Ed Sheeran",      wrong:["James Arthur","Charlie Puth","Calum Scott"] },
    { title:"Ghost",                  artist:"Justin Bieber",   wrong:["Shawn Mendes","Niall Horan","Lewis Capaldi"] },
    { title:"Peaches",                artist:"Justin Bieber",   wrong:["Chris Brown","Trey Songz","Giveon"] },
    { title:"Cupid",                  artist:"FIFTY FIFTY",     wrong:["BLACKPINK","aespa","NewJeans"] },
    { title:"Escapism",               artist:"RAYE",            wrong:["Dua Lipa","FKA twigs","PinkPantheress"] },
    { title:"Trustfall",              artist:"Pink",            wrong:["Kelly Clarkson","Alanis Morissette","Sheryl Crow"] },
    { title:"Calm Down",              artist:"Rema",            wrong:["Burna Boy","WizKid","Afrobeats"] },
    { title:"Savage Love",            artist:"Jason Derulo",    wrong:["Bruno Mars","Ne-Yo","Usher"] },
    { title:"Astronaut in the Ocean", artist:"Masked Wolf",     wrong:["Powfu","Joyner Lucas","Tom MacDonald"] },
    { title:"Beggin",                 artist:"Maneskin",        wrong:["Imagine Dragons","The Killers","Arctic Monkeys"] },
    { title:"Riptide",                artist:"Vance Joy",       wrong:["James Bay","Tom Odell","Hozier"] },
    { title:"Budapest",               artist:"George Ezra",     wrong:["James Bay","Hozier","Vance Joy"] },
  ],
  "2000s": [
    { title:"Crazy in Love",          artist:"Beyoncé",         wrong:["Rihanna","Alicia Keys","Destiny's Child"] },
    { title:"Umbrella",               artist:"Rihanna",         wrong:["Beyoncé","Ciara","Cassie"] },
    { title:"Yeah!",                  artist:"Usher",           wrong:["Ne-Yo","Chris Brown","Mario"] },
    { title:"In da Club",             artist:"50 Cent",         wrong:["Eminem","Ja Rule","DMX"] },
    { title:"Lose Yourself",          artist:"Eminem",          wrong:["50 Cent","Dr. Dre","Kanye West"] },
    { title:"Hey Ya!",                artist:"OutKast",         wrong:["Kanye West","Pharrell","Missy Elliott"] },
    { title:"Toxic",                  artist:"Britney Spears",  wrong:["Christina Aguilera","Jessica Simpson","Hilary Duff"] },
    { title:"Beautiful",              artist:"Christina Aguilera",wrong:["Pink","Mariah Carey","Alicia Keys"] },
    { title:"Hips Don't Lie",         artist:"Shakira",         wrong:["Jennifer Lopez","Paulina Rubio","Gloria Estefan"] },
    { title:"Gold Digger",            artist:"Kanye West",      wrong:["Jay-Z","Ludacris","T.I."] },
    { title:"Boulevard of Broken Dreams",artist:"Green Day",    wrong:["Blink-182","Sum 41","Simple Plan"] },
    { title:"Mr. Brightside",         artist:"The Killers",     wrong:["Franz Ferdinand","Interpol","Bloc Party"] },
    { title:"Seven Nation Army",      artist:"The White Stripes",wrong:["The Black Keys","Queens of the Stone Age","Wolfmother"] },
    { title:"Low",                    artist:"Flo Rida",        wrong:["T-Pain","Pitbull","Lil Wayne"] },
    { title:"Tik Tok",                artist:"Ke$ha",           wrong:["Katy Perry","Lady Gaga","Rihanna"] },
    { title:"Just Dance",             artist:"Lady Gaga",       wrong:["Ke$ha","Katy Perry","Fergie"] },
    { title:"Bad Romance",            artist:"Lady Gaga",       wrong:["Beyoncé","Rihanna","Katy Perry"] },
    { title:"California Gurls",       artist:"Katy Perry",      wrong:["Ke$ha","Nicki Minaj","Niki & Vinni"] },
    { title:"Irreplaceable",          artist:"Beyoncé",         wrong:["Rihanna","Alicia Keys","Mary J. Blige"] },
    { title:"Stronger",               artist:"Kanye West",      wrong:["Jay-Z","Ludacris","T.I."] },
    { title:"Clocks",                 artist:"Coldplay",        wrong:["U2","Radiohead","Muse"] },
    { title:"Take Me Out",            artist:"Franz Ferdinand", wrong:["The Killers","Arctic Monkeys","Bloc Party"] },
    { title:"Stacy's Mom",            artist:"Fountains of Wayne",wrong:["Weezer","Barenaked Ladies","The Ataris"] },
    { title:"American Idiot",         artist:"Green Day",       wrong:["My Chemical Romance","Fall Out Boy","Panic! at the Disco"] },
    { title:"Sugar We're Goin Down",  artist:"Fall Out Boy",    wrong:["Panic! at the Disco","My Chemical Romance","The Academy Is"] },
    { title:"I Write Sins",           artist:"Panic! at the Disco",wrong:["My Chemical Romance","The Used","Thursday"] },
    { title:"Welcome to the Black Parade",artist:"My Chemical Romance",wrong:["Linkin Park","Evanescence","Paramore"] },
    { title:"Numb",                   artist:"Linkin Park",     wrong:["Evanescence","Papa Roach","Nickelback"] },
    { title:"Bring Me to Life",       artist:"Evanescence",     wrong:["Within Temptation","Nightwish","Paramore"] },
    { title:"Since U Been Gone",      artist:"Kelly Clarkson",  wrong:["Pink","Alanis Morissette","Avril Lavigne"] },
    { title:"Livin' la Vida Loca",    artist:"Ricky Martin",    wrong:["Marc Anthony","Enrique Iglesias","Jon Secada"] },
    { title:"Apologize",              artist:"OneRepublic",     wrong:["Timbaland","Maroon 5","Matchbox Twenty"] },
    { title:"Viva la Vida",           artist:"Coldplay",        wrong:["U2","Snow Patrol","Keane"] },
    { title:"Hey There Delilah",      artist:"Plain White T's", wrong:["Jack Johnson","Jason Mraz","John Mayer"] },
    { title:"Move Along",             artist:"The All-American Rejects",wrong:["Yellowcard","Hawthorne Heights","The Starting Line"] },
    { title:"Shake It",               artist:"Metro Station",   wrong:["All Time Low","Forever the Sickest Kids","Cobra Starship"] },
    { title:"OMG",                    artist:"Usher",           wrong:["Chris Brown","Ne-Yo","Trey Songz"] },
    { title:"Best of You",            artist:"Foo Fighters",    wrong:["Nickelback","Puddle of Mudd","Creed"] },
    { title:"In Too Deep",            artist:"Sum 41",          wrong:["Simple Plan","Good Charlotte","Blink-182"] },
    { title:"Numb/Encore",            artist:"Linkin Park",     wrong:["Eminem","Limp Bizkit","Coldplay"] },
    { title:"B.Y.O.B.",               artist:"System of a Down",wrong:["Slipknot","Korn","Marilyn Manson"] },
    { title:"Float On",               artist:"Modest Mouse",    wrong:["Death Cab for Cutie","The Shins","Iron & Wine"] },
    { title:"Iris",                   artist:"Goo Goo Dolls",   wrong:["Third Eye Blind","Matchbox Twenty","Barenaked Ladies"] },
    { title:"Push",                   artist:"Matchbox Twenty", wrong:["Third Eye Blind","Goo Goo Dolls","Counting Crows"] },
    { title:"Semi-Charmed Life",      artist:"Third Eye Blind", wrong:["Matchbox Twenty","Counting Crows","Gin Blossoms"] },
    { title:"Mr. Jones",              artist:"Counting Crows",  wrong:["Matchbox Twenty","Third Eye Blind","Fastball"] },
    { title:"Be Like That",           artist:"3 Doors Down",    wrong:["Matchbox Twenty","Puddle of Mudd","Creed"] },
    { title:"The Middle",             artist:"Jimmy Eat World", wrong:["Dashboard Confessional","Something Corporate","The Get Up Kids"] },
    { title:"Mambo No. 5",            artist:"Lou Bega",        wrong:["Ricky Martin","Marc Anthony","Enrique Iglesias"] },
    { title:"Are You Gonna Be My Girl",artist:"Jet",            wrong:["Franz Ferdinand","Kaiser Chiefs","The Hives"] },
    { title:"Last Nite",              artist:"The Strokes",     wrong:["The Vines","The Hives","The Libertines"] },
  ],
  "90s": [
    { title:"Smells Like Teen Spirit",    artist:"Nirvana",         wrong:["Pearl Jam","Soundgarden","Alice in Chains"] },
    { title:"Wonderwall",                 artist:"Oasis",           wrong:["Blur","Pulp","Suede"] },
    { title:"...Baby One More Time",      artist:"Britney Spears",  wrong:["Christina Aguilera","Backstreet Boys","NSYNC"] },
    { title:"Waterfalls",                 artist:"TLC",             wrong:["Destiny's Child","En Vogue","SWV"] },
    { title:"No Scrubs",                  artist:"TLC",             wrong:["Destiny's Child","Brandy","Monica"] },
    { title:"I Will Always Love You",     artist:"Whitney Houston", wrong:["Mariah Carey","Celine Dion","Dolly Parton"] },
    { title:"Gangsta's Paradise",         artist:"Coolio",          wrong:["Tupac","Notorious B.I.G.","Snoop Dogg"] },
    { title:"California Love",            artist:"2Pac",            wrong:["Snoop Dogg","Ice Cube","Dr. Dre"] },
    { title:"Hypnotize",                  artist:"Notorious B.I.G.",wrong:["Jay-Z","Puff Daddy","Mase"] },
    { title:"Wannabe",                    artist:"Spice Girls",     wrong:["All Saints","Atomic Kitten","Sugababes"] },
    { title:"Mmmbop",                     artist:"Hanson",          wrong:["Backstreet Boys","NSYNC","98 Degrees"] },
    { title:"Quit Playing Games",         artist:"Backstreet Boys", wrong:["NSYNC","98 Degrees","New Kids on the Block"] },
    { title:"Livin' la Vida Loca",        artist:"Ricky Martin",    wrong:["Marc Anthony","Enrique Iglesias","Jon Secada"] },
    { title:"Macarena",                   artist:"Los del Rio",     wrong:["Ricky Martin","Enrique Iglesias","Chayanne"] },
    { title:"Tubthumping",                artist:"Chumbawamba",     wrong:["Fatboy Slim","Prodigy","Chemical Brothers"] },
    { title:"Ironic",                     artist:"Alanis Morissette",wrong:["Sheryl Crow","Sarah McLachlan","Fiona Apple"] },
    { title:"Black Hole Sun",             artist:"Soundgarden",     wrong:["Pearl Jam","Alice in Chains","Stone Temple Pilots"] },
    { title:"Jeremy",                     artist:"Pearl Jam",       wrong:["Soundgarden","Nirvana","Stone Temple Pilots"] },
    { title:"Losing My Religion",         artist:"R.E.M.",          wrong:["The Cure","Depeche Mode","New Order"] },
    { title:"Creep",                      artist:"Radiohead",       wrong:["Blur","Suede","Pulp"] },
    { title:"Common People",              artist:"Pulp",            wrong:["Blur","Elastica","Sleeper"] },
    { title:"Song 2",                     artist:"Blur",            wrong:["Oasis","Pulp","Suede"] },
    { title:"Firestarter",                artist:"Prodigy",         wrong:["Chemical Brothers","Fatboy Slim","Underworld"] },
    { title:"Smooth Criminal",            artist:"Michael Jackson", wrong:["Prince","James Brown","Boyz II Men"] },
    { title:"Baby Got Back",              artist:"Sir Mix-a-Lot",   wrong:["Snoop Dogg","Ice Cube","Dr. Dre"] },
    { title:"Return of the Mack",         artist:"Mark Morrison",   wrong:["Craig David","Shaggy","UB40"] },
    { title:"Iris",                       artist:"Goo Goo Dolls",   wrong:["Third Eye Blind","Matchbox Twenty","Barenaked Ladies"] },
    { title:"What's Up",                 artist:"4 Non Blondes",    wrong:["Alanis Morissette","Sheryl Crow","Joan Osborne"] },
    { title:"Mambo No. 5",               artist:"Lou Bega",         wrong:["Ricky Martin","Marc Anthony","Enrique Iglesias"] },
    { title:"La Isla Bonita",            artist:"Madonna",          wrong:["Shakira","Jennifer Lopez","Gloria Estefan"] },
    { title:"Ray of Light",              artist:"Madonna",          wrong:["Cher","Kylie Minogue","Annie Lennox"] },
    { title:"I Want It That Way",        artist:"Backstreet Boys",  wrong:["NSYNC","Boyz II Men","New Kids on the Block"] },
    { title:"I Believe I Can Fly",       artist:"R. Kelly",         wrong:["Boyz II Men","Brian McKnight","Joe"] },
    { title:"Fantasy",                   artist:"Mariah Carey",     wrong:["Whitney Houston","Janet Jackson","TLC"] },
    { title:"End of the Road",           artist:"Boyz II Men",      wrong:["New Edition","R. Kelly","Brian McKnight"] },
    { title:"Mysterious Girl",           artist:"Peter Andre",      wrong:["Craig David","Shaggy","Mark Morrison"] },
    { title:"Angel",                     artist:"Shaggy",           wrong:["Craig David","Mark Morrison","UB40"] },
    { title:"It Wasn't Me",             artist:"Shaggy",            wrong:["Craig David","Mark Morrison","Sean Paul"] },
    { title:"Fill Me In",               artist:"Craig David",       wrong:["Mark Morrison","Shaggy","UB40"] },
    { title:"Ice Ice Baby",             artist:"Vanilla Ice",       wrong:["MC Hammer","Tone Loc","Young MC"] },
    { title:"U Can't Touch This",       artist:"MC Hammer",         wrong:["Vanilla Ice","Tone Loc","Young MC"] },
    { title:"Jump",                     artist:"Kris Kross",        wrong:["Tag Team","House of Pain","Young MC"] },
    { title:"You Oughta Know",          artist:"Alanis Morissette", wrong:["Fiona Apple","PJ Harvey","Liz Phair"] },
    { title:"Tearin' Up My Heart",      artist:"NSYNC",             wrong:["Backstreet Boys","New Edition","Bobby Brown"] },
    { title:"Everybody",               artist:"Backstreet Boys",    wrong:["NSYNC","New Kids on the Block","98 Degrees"] },
    { title:"Hot Hot Hot",             artist:"Arrow",              wrong:["Buster Poindexter","Harry Belafonte","Lord Kitchener"] },
    { title:"Informer",               artist:"Snow",                wrong:["Shaggy","UB40","Inner Circle"] },
    { title:"Semi-Charmed Life",      artist:"Third Eye Blind",     wrong:["Matchbox Twenty","Counting Crows","Gin Blossoms"] },
    { title:"Mr. Jones",              artist:"Counting Crows",      wrong:["Matchbox Twenty","Third Eye Blind","Fastball"] },
    { title:"Since U Been Gone",      artist:"Kelly Clarkson",      wrong:["Pink","Alanis Morissette","Avril Lavigne"] },
    { title:"Push",                   artist:"Matchbox Twenty",     wrong:["Third Eye Blind","Goo Goo Dolls","Counting Crows"] },
  ],
  rnb: [
    { title:"Crazy in Love",         artist:"Beyoncé",         wrong:["Rihanna","Alicia Keys","Ciara"] },
    { title:"Yeah!",                 artist:"Usher",           wrong:["Ne-Yo","Chris Brown","Mario"] },
    { title:"Ignition",              artist:"R. Kelly",        wrong:["Usher","Ne-Yo","Chris Brown"] },
    { title:"Crazy",                 artist:"Gnarls Barkley",  wrong:["OutKast","Cee Lo Green","Bruno Mars"] },
    { title:"Umbrella",              artist:"Rihanna",         wrong:["Beyoncé","Ciara","Cassie"] },
    { title:"Diamonds",              artist:"Rihanna",         wrong:["Beyoncé","Alicia Keys","Mariah Carey"] },
    { title:"Love on Top",           artist:"Beyoncé",         wrong:["Alicia Keys","Mary J. Blige","Mariah Carey"] },
    { title:"Good Days",             artist:"SZA",             wrong:["H.E.R.","Jhené Aiko","Summer Walker"] },
    { title:"Earned It",             artist:"The Weeknd",      wrong:["Miguel","Frank Ocean","Trey Songz"] },
    { title:"Often",                 artist:"The Weeknd",      wrong:["Drake","PartyNextDoor","Nav"] },
    { title:"Leave the Door Open",   artist:"Bruno Mars",      wrong:["The Weeknd","Miguel","Daniel Caesar"] },
    { title:"Essence",               artist:"WizKid",          wrong:["Burna Boy","Davido","Rema"] },
    { title:"Adorn",                 artist:"Miguel",          wrong:["Frank Ocean","The Weeknd","Daniel Caesar"] },
    { title:"Novacane",              artist:"Frank Ocean",     wrong:["The Weeknd","Miguel","PARTYNEXTDOOR"] },
    { title:"Superstar",             artist:"Usher",           wrong:["Chris Brown","Ne-Yo","Trey Songz"] },
    { title:"Confessions Part II",   artist:"Usher",           wrong:["Chris Brown","Mario","Omarion"] },
    { title:"The Boy Is Mine",       artist:"Brandy & Monica", wrong:["Mariah & Whitney","TLC","En Vogue"] },
    { title:"Angel",                 artist:"Shaggy",          wrong:["Craig David","Mark Morrison","UB40"] },
    { title:"Wild Thoughts",         artist:"DJ Khaled",       wrong:["Chris Brown","Usher","Ne-Yo"] },
    { title:"We Found Love",         artist:"Rihanna",         wrong:["Beyoncé","Ciara","Cassie"] },
    { title:"All of the Lights",     artist:"Kanye West",      wrong:["Jay-Z","John Legend","The Weeknd"] },
    { title:"Deja Vu",               artist:"Beyoncé",         wrong:["Alicia Keys","Mary J. Blige","Jennifer Hudson"] },
    { title:"Say My Name",           artist:"Destiny's Child", wrong:["TLC","En Vogue","Brandy"] },
    { title:"Survivor",              artist:"Destiny's Child", wrong:["TLC","En Vogue","SWV"] },
    { title:"This Is America",       artist:"Childish Gambino",wrong:["Kendrick Lamar","J. Cole","Drake"] },
    { title:"Redbone",               artist:"Childish Gambino",wrong:["Frank Ocean","Miguel","The Weeknd"] },
    { title:"Pillowtalk",            artist:"ZAYN",            wrong:["Harry Styles","Niall Horan","Liam Payne"] },
    { title:"Blessed",               artist:"Daniel Caesar",   wrong:["H.E.R.","Giveon","Lucky Daye"] },
    { title:"Sativa",                artist:"Jhené Aiko",      wrong:["SZA","H.E.R.","Summer Walker"] },
    { title:"Middle Child",          artist:"J. Cole",         wrong:["Kendrick Lamar","Drake","Big Sean"] },
    { title:"No Scrubs",             artist:"TLC",             wrong:["Destiny's Child","Brandy","Monica"] },
    { title:"Waterfalls",            artist:"TLC",             wrong:["Destiny's Child","En Vogue","SWV"] },
    { title:"Come Through",          artist:"H.E.R.",          wrong:["Jhené Aiko","Summer Walker","SZA"] },
    { title:"Peaches",               artist:"Justin Bieber",   wrong:["Chris Brown","Trey Songz","Giveon"] },
    { title:"We Don't Talk Anymore", artist:"Charlie Puth",    wrong:["Sam Smith","Shawn Mendes","James Arthur"] },
    { title:"Skin",                  artist:"Rihanna",         wrong:["Beyoncé","Ciara","Tinashe"] },
    { title:"For Free",              artist:"DJ Khaled",       wrong:["Drake","Future","Lil Wayne"] },
    { title:"Superstar",             artist:"Usher",           wrong:["Chris Brown","Ne-Yo","Trey Songz"] },
    { title:"Before I Let Go",       artist:"Beyoncé",         wrong:["Mary J. Blige","Jennifer Hudson","Ledisi"] },
    { title:"HUMBLE.",               artist:"Kendrick Lamar",  wrong:["J. Cole","Drake","Big Sean"] },
    { title:"Tennessee Whiskey",     artist:"Chris Stapleton", wrong:["Luke Bryan","Blake Shelton","Jason Aldean"] },
    { title:"Slow Motion",           artist:"Trey Songz",      wrong:["Chris Brown","Ne-Yo","Mario"] },
    { title:"Issues",                artist:"Julia Michaels",  wrong:["Alessia Cara","Demi Lovato","Halsey"] },
    { title:"None of Your Concern",  artist:"Big Sean",        wrong:["Jhené Aiko","SZA","H.E.R."] },
    { title:"Golden Hour",           artist:"JVKE",            wrong:["Conan Gray","Cian Ducrot","Stephen Sanchez"] },
    { title:"Neighbors Know My Name",artist:"Trey Songz",      wrong:["Chris Brown","Usher","Tank"] },
    { title:"Kill Bill",             artist:"SZA",             wrong:["H.E.R.","Jhené Aiko","Summer Walker"] },
    { title:"Cater 2 U",             artist:"Destiny's Child", wrong:["TLC","En Vogue","SWV"] },
    { title:"Fantasy",               artist:"Mariah Carey",    wrong:["Whitney Houston","Janet Jackson","TLC"] },
    { title:"Nice & Slow",           artist:"Usher",           wrong:["Keith Sweat","R. Kelly","Babyface"] },
    { title:"Sicko Mode",            artist:"Travis Scott",    wrong:["Drake","Future","Young Thug"] },
  ],
  inter: [
    { title:"Shape of You",          artist:"Ed Sheeran",      wrong:["Sam Smith","James Arthur","Charlie Puth"] },
    { title:"Despacito",             artist:"Luis Fonsi",      wrong:["J Balvin","Bad Bunny","Maluma"] },
    { title:"Gangnam Style",         artist:"PSY",             wrong:["CL","G-Dragon","Big Bang"] },
    { title:"Blinding Lights",       artist:"The Weeknd",      wrong:["Drake","Post Malone","Bruno Mars"] },
    { title:"Someone You Loved",     artist:"Lewis Capaldi",   wrong:["James Arthur","Calum Scott","James Bay"] },
    { title:"Shallow",               artist:"Lady Gaga",       wrong:["Adele","P!nk","Demi Lovato"] },
    { title:"Old Town Road",         artist:"Lil Nas X",       wrong:["Billy Ray Cyrus","Kane Brown","Darius Rucker"] },
    { title:"Rockstar",              artist:"Post Malone",     wrong:["Juice WRLD","XXXTentacion","Lil Uzi Vert"] },
    { title:"God's Plan",            artist:"Drake",           wrong:["Travis Scott","Future","Young Thug"] },
    { title:"Havana",                artist:"Camila Cabello",  wrong:["Shakira","Jennifer Lopez","Selena Gomez"] },
    { title:"HUMBLE.",               artist:"Kendrick Lamar",  wrong:["J. Cole","Drake","Big Sean"] },
    { title:"Bad and Boujee",        artist:"Migos",           wrong:["Quality Control","Rich the Kid","Lil Yachty"] },
    { title:"Lucid Dreams",          artist:"Juice WRLD",      wrong:["Lil Uzi Vert","Trippie Redd","XXXTentacion"] },
    { title:"SAD!",                  artist:"XXXTentacion",    wrong:["Juice WRLD","Lil Uzi Vert","Trippie Redd"] },
    { title:"Sicko Mode",            artist:"Travis Scott",    wrong:["Drake","Future","Young Thug"] },
    { title:"Lean On",               artist:"Major Lazer",     wrong:["Calvin Harris","Kygo","Avicii"] },
    { title:"Wake Me Up",            artist:"Avicii",          wrong:["Kygo","Zedd","Martin Garrix"] },
    { title:"Animals",               artist:"Martin Garrix",   wrong:["Hardwell","Tiësto","Afrojack"] },
    { title:"Faded",                 artist:"Alan Walker",     wrong:["Martin Garrix","Kygo","Avicii"] },
    { title:"Closer",                artist:"The Chainsmokers",wrong:["Marshmello","Illenium","Kygo"] },
    { title:"Stressed Out",          artist:"Twenty One Pilots",wrong:["Imagine Dragons","Fall Out Boy","Panic! at the Disco"] },
    { title:"Thunder",               artist:"Imagine Dragons", wrong:["Twenty One Pilots","OneRepublic","Bastille"] },
    { title:"Believer",              artist:"Imagine Dragons", wrong:["OneRepublic","Bastille","Twenty One Pilots"] },
    { title:"Radioactive",           artist:"Imagine Dragons", wrong:["Muse","Coldplay","Linkin Park"] },
    { title:"Don't You Worry Child", artist:"Swedish House Mafia",wrong:["Avicii","Calvin Harris","Tiësto"] },
    { title:"Power",                 artist:"Kanye West",      wrong:["Jay-Z","Big Sean","Kid Cudi"] },
    { title:"Last Last",             artist:"Burna Boy",       wrong:["WizKid","Davido","Afrobeats"] },
    { title:"Love Nwantiti",         artist:"CKay",            wrong:["Fireboy DML","Omah Lay","Kizz Daniel"] },
    { title:"Jerusalema",            artist:"Master KG",       wrong:["Nomcebo Zikode","Busiswa","Mafikizolo"] },
    { title:"Beggin",                artist:"Maneskin",        wrong:["Imagine Dragons","The Killers","Arctic Monkeys"] },
    { title:"Take Me to Church",     artist:"Hozier",          wrong:["James Bay","Tom Odell","Vance Joy"] },
    { title:"Let Her Go",            artist:"Passenger",       wrong:["James Bay","Hozier","Tom Odell"] },
    { title:"Hold Back the River",   artist:"James Bay",       wrong:["Hozier","George Ezra","Passenger"] },
    { title:"Feel So Close",         artist:"Calvin Harris",   wrong:["Avicii","Kygo","Zedd"] },
    { title:"Sunflower",             artist:"Post Malone",     wrong:["Swae Lee","Travis Scott","Lil Baby"] },
    { title:"Drip Too Hard",         artist:"Lil Baby",        wrong:["Gunna","Young Thug","Lil Durk"] },
    { title:"Congratulations",       artist:"Post Malone",     wrong:["Lil Uzi Vert","Juice WRLD","Trippie Redd"] },
    { title:"Don't Let Me Down",     artist:"The Chainsmokers",wrong:["Marshmello","Kygo","Illenium"] },
    { title:"Natural",               artist:"Imagine Dragons", wrong:["Twenty One Pilots","OneRepublic","Panic! at the Disco"] },
    { title:"XO Tour Llif3",         artist:"Lil Uzi Vert",    wrong:["Juice WRLD","Polo G","Rod Wave"] },
    { title:"Sweet Nothing",         artist:"Calvin Harris",   wrong:["Avicii","Kygo","Zedd"] },
    { title:"GOAT",                  artist:"Burna Boy",       wrong:["WizKid","Davido","Rema"] },
    { title:"Happier",               artist:"Marshmello",      wrong:["Kygo","Avicii","Martin Garrix"] },
    { title:"Zitti e buoni",         artist:"Maneskin",        wrong:["Imagine Dragons","The Killers","Franz Ferdinand"] },
    { title:"Bodak Yellow",          artist:"Cardi B",         wrong:["Nicki Minaj","City Girls","Saweetie"] },
    { title:"God's Plan",            artist:"Drake",           wrong:["Travis Scott","Future","Young Thug"] },
    { title:"Calm Down",             artist:"Rema",            wrong:["Burna Boy","WizKid","Afrobeats"] },
    { title:"As It Was",             artist:"Harry Styles",    wrong:["Ed Sheeran","Sam Smith","Shawn Mendes"] },
    { title:"Anti-Hero",             artist:"Taylor Swift",    wrong:["Sabrina Carpenter","Olivia Rodrigo","Gracie Abrams"] },
    { title:"Flowers",               artist:"Miley Cyrus",     wrong:["Dua Lipa","Ariana Grande","Selena Gomez"] },
    { title:"Industry Baby",         artist:"Lil Nas X",       wrong:["Jack Harlow","Doja Cat","Tyler the Creator"] },
  ],
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

type Phase = "menu" | "create_lobby" | "join_lobby" | "lobby" | "listening" | "choosing" | "reveal" | "distribute" | "finished"

export default function BlindTest({ members, myUserId, groupId, onAwardDistance, onClose }: Props) {
  const supabase = createClient()

  // État principal
  const [phase, setPhase] = useState<Phase>("menu")
  const [isHost, setIsHost] = useState(false)
  const [sessionCode, setSessionCode] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [category, setCategory] = useState("")
  const [players, setPlayers] = useState<any[]>([])
  const [questions, setQuestions] = useState<any[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [choices, setChoices] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [listenTimer, setListenTimer] = useState(10)
  const [chooseTimer, setChooseTimer] = useState(10)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [ytId, setYtId] = useState("")
  const [fastestId, setFastestId] = useState<string | null>(null)
  const [distributeTarget, setDistributeTarget] = useState<string | null>(null)
  const [joinError, setJoinError] = useState("")

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const wasPlaying = useRef(false)
  const channelRef = useRef<any>(null)
  const lobbyPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const q = questions[qIndex]
  const catInfo = CATEGORIES.find(c => c.id === category)

  // Stop ambiance au montage
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

  // ── CRÉER UNE SESSION ──
  const createSession = async (catId: string) => {
    const code = generateCode()
    const pool = shuffle(SONGS[catId]).slice(0, 10)
    const { data, error } = await supabase.from("blindtest_sessions").insert({
      code,
      group_id: groupId,
      host_id: myUserId,
      category: catId,
      questions: pool,
      status: "waiting",
      q_index: 0,
      scores: {},
    }).select().single()
    if (error || !data) return
    setSessionCode(code)
    setSessionId(data.id)
    setCategory(catId)
    setQuestions(pool)
    setIsHost(true)
    setPlayers([members.find(m => m.user_id === myUserId)])
    setPhase("lobby")
    startLobbyPoll(data.id)
  }

  // ── POLLING LOBBY ──
  const startLobbyPoll = (sid: string) => {
    if (lobbyPollRef.current) clearInterval(lobbyPollRef.current)
    lobbyPollRef.current = setInterval(async () => {
      const { data } = await supabase.from("blindtest_sessions").select("*").eq("id", sid).single()
      if (!data) return
      // Mettre à jour la liste des joueurs
      if (data.players) setPlayers(data.players)
      // Si la partie a été lancée par le host
      if (data.status === "listening") {
        clearInterval(lobbyPollRef.current!)
        setQIndex(data.q_index)
        setQuestions(data.questions)
        setChoices(shuffle([data.questions[data.q_index].artist, ...data.questions[data.q_index].wrong]))
        setSelected(null)
        setYtId(data.yt_id || "")
        setFastestId(null)
        setListenTimer(10)
        setChooseTimer(10)
        setPhase("listening")
        subscribeToSession(sid)
      }
    }, 1500)
    setTimeout(() => { if (lobbyPollRef.current) clearInterval(lobbyPollRef.current) }, 15 * 60 * 1000)
  }

  // ── REJOINDRE UNE SESSION ──
  const joinSession = async () => {
    setJoinError("")
    const { data, error } = await supabase.from("blindtest_sessions")
      .select("*")
      .eq("code", joinCode.trim())
      .eq("group_id", groupId)
      .eq("status", "waiting")
      .single()
    if (error || !data) { setJoinError("Code invalide ou partie déjà commencée"); return }

    setSessionId(data.id)
    setCategory(data.category)
    setQuestions(data.questions)
    setIsHost(false)
    // Ajouter le joueur à la session
    const currentPlayers = data.players || []
    const myMember = members.find(m => m.user_id === myUserId)
    if (!currentPlayers.find((p: any) => p.user_id === myUserId)) {
      await supabase.from("blindtest_sessions").update({
        players: [...currentPlayers, myMember]
      }).eq("id", data.id)
    }
    setPlayers([...currentPlayers, myMember])
    setPhase("lobby")
    startLobbyPoll(data.id)
  }

  // ── REALTIME ──
  const subscribeToSession = (sid: string) => {
    channelRef.current = supabase.channel(`blindtest:${sid}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "blindtest_sessions", filter: `id=eq.${sid}` },
        (payload) => handleSessionUpdate(payload.new as any))
      .subscribe()
  }

  const handleSessionUpdate = (data: any) => {
    if (data.status === "listening") {
      setQIndex(data.q_index)
      setQuestions(data.questions)
      setChoices(shuffle([data.questions[data.q_index].artist, ...data.questions[data.q_index].wrong]))
      setSelected(null)
      setYtId(data.yt_id || "")
      setFastestId(null)
      setListenTimer(10)
      setChooseTimer(10)
      setPhase("listening")
    }
    if (data.status === "choosing") {
      setPhase("choosing")
    }
    if (data.status === "reveal") {
      setFastestId(data.fastest_id)
      setScores(data.scores || {})
      setPhase("reveal")
    }
    if (data.status === "finished") {
      setScores(data.scores || {})
      setPhase("finished")
    }
    // Mettre à jour les joueurs
    if (data.players) setPlayers(data.players)
  }

  // ── LANCER LA PARTIE (host) ──
  const startGame = async () => {
    const q0 = questions[0]
    let ytId = ""
    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(q0.title + " " + q0.artist + " official audio")}`)
      const d = await res.json()
      ytId = d.id || ""
    } catch {}

    // Sauvegarder les questions et lancer
    await supabase.from("blindtest_sessions").update({
      status: "listening",
      q_index: 0,
      yt_id: ytId,
      fastest_id: null,
      questions: questions,
    }).eq("id", sessionId)

    // Host passe directement en jeu
    clearInterval(lobbyPollRef.current!)
    setQIndex(0)
    setChoices(shuffle([q0.artist, ...q0.wrong]))
    setSelected(null)
    setYtId(ytId)
    setFastestId(null)
    setListenTimer(10)
    setChooseTimer(10)
    setPhase("listening")
    subscribeToSession(sessionId)
  }

  // ── TIMER ÉCOUTE (10s) ──
  useEffect(() => {
    if (phase !== "listening") return
    clearInterval(timerRef.current!)
    timerRef.current = setInterval(() => {
      setListenTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          // Host passe à "choosing"
          if (isHost) {
            supabase.from("blindtest_sessions").update({ status: "choosing" }).eq("id", sessionId)
          }
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [phase, qIndex])

  // ── TIMER CHOIX (10s) ──
  useEffect(() => {
    if (phase !== "choosing") return
    clearInterval(timerRef.current!)
    timerRef.current = setInterval(() => {
      setChooseTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          // Host calcule les résultats
          if (isHost) revealResults()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [phase])

  // ── SOUMETTRE UN CHOIX ──
  const submitChoice = async (choice: string) => {
    if (selected || phase !== "choosing") return
    setSelected(choice)
    const correct = choice === q.artist
    if (correct) {
      // Enregistrer le choix dans Supabase
      const { data } = await supabase.from("blindtest_sessions").select("fastest_id, answers").eq("id", sessionId).single()
      if (!data?.fastest_id) {
        // Je suis le premier correct
        await supabase.from("blindtest_sessions").update({ fastest_id: myUserId }).eq("id", sessionId)
      }
    }
  }

  // ── RÉVÉLER LES RÉSULTATS (host) ──
  const revealResults = async () => {
    const { data } = await supabase.from("blindtest_sessions").select("fastest_id, scores").eq("id", sessionId).single()
    const newScores = { ...(data?.scores || scores) }
    if (data?.fastest_id) newScores[data.fastest_id] = (newScores[data.fastest_id] || 0) + 1

    const isLast = qIndex >= questions.length - 1
    await supabase.from("blindtest_sessions").update({
      status: isLast ? "finished" : "reveal",
      scores: newScores,
      fastest_id: data?.fastest_id || null,
    }).eq("id", sessionId)
  }

  // ── QUESTION SUIVANTE (host) ──
  const nextQuestion = async () => {
    const nextIdx = qIndex + 1
    const q = questions[nextIdx]
    let ytId = ""
    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(q.title + " " + q.artist + " official audio")}`)
      const d = await res.json()
      ytId = d.id || ""
    } catch {}
    await supabase.from("blindtest_sessions").update({
      status: "listening",
      q_index: nextIdx,
      yt_id: ytId,
      fastest_id: null,
    }).eq("id", sessionId)
  }

  // ── DISTRIBUER ──
  const handleDistribute = async (targetId: string) => {
    setDistributeTarget(targetId)
    onAwardDistance(targetId, -20)
    setTimeout(async () => {
      setDistributeTarget(null)
      if (isHost) await nextQuestion()
    }, 1500)
  }

  const BG: any = { position:"fixed", inset:0, background:"var(--bg)", zIndex:400, display:"flex", flexDirection:"column" as const, alignItems:"center", overflowY:"auto" as const, padding:"28px 20px 40px" }
  const W = { width:"100%", maxWidth:360 }

  // ── MENU ──
  if (phase === "menu") return (
    <div style={BG}>
      <div style={W}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>🎵 BLIND TEST</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ display:"flex", flexDirection:"column" as const, gap:12 }}>
          <button onClick={() => setPhase("create_lobby")}
            style={{ padding:"20px", borderRadius:16, border:"2px solid var(--border)", cursor:"pointer", background:"linear-gradient(135deg,#1a1030,#0d0820)", display:"flex", flexDirection:"column" as const, alignItems:"flex-start", gap:6 }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:2, color:"var(--accent)" }}>🎯 CRÉER UNE PARTIE</div>
            <div style={{ fontSize:12, color:"#6b7280" }}>Choisis une catégorie et invite tes amis</div>
          </button>

          <button onClick={() => setPhase("join_lobby")}
            style={{ padding:"20px", borderRadius:16, border:"2px solid var(--border)", cursor:"pointer", background:"var(--bg-card)", display:"flex", flexDirection:"column" as const, alignItems:"flex-start", gap:6 }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:2, color:"#e2e8f0" }}>🔢 REJOINDRE UNE PARTIE</div>
            <div style={{ fontSize:12, color:"#6b7280" }}>Entre le code à 4 chiffres</div>
          </button>
        </div>
      </div>
    </div>
  )

  // ── CRÉER LOBBY ──
  if (phase === "create_lobby") return (
    <div style={BG}>
      <div style={W}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <button onClick={() => setPhase("menu")} style={{ background:"none", border:"none", color:"#6b7280", fontSize:20, cursor:"pointer" }}>← Retour</button>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:13, letterSpacing:3, color:"#4b5563", marginBottom:16 }}>— CHOISIS UNE CATÉGORIE —</div>

        <div style={{ display:"flex", flexDirection:"column" as const, gap:10 }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => createSession(cat.id)}
              style={{ padding:"16px 20px", borderRadius:14, border:"1px solid var(--border)", cursor:"pointer", background:"var(--bg-card)", display:"flex", alignItems:"center", gap:14, width:"100%" }}>
              <span style={{ fontSize:26 }}>{cat.emoji}</span>
              <div style={{ textAlign:"left" as const }}>
                <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:16, letterSpacing:2, color:"#e2e8f0" }}>{cat.label}</div>
                <div style={{ fontSize:11, color:"#4b5563", marginTop:2 }}>10 questions • 10s d'écoute • 10s pour choisir</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // ── REJOINDRE LOBBY ──
  if (phase === "join_lobby") return (
    <div style={BG}>
      <div style={W}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <button onClick={() => setPhase("menu")} style={{ background:"none", border:"none", color:"#6b7280", fontSize:20, cursor:"pointer" }}>← Retour</button>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:3, color:"var(--accent)", marginBottom:20 }}>🔢 CODE DE LA PARTIE</div>

        <input
          type="number"
          placeholder="1234"
          value={joinCode}
          onChange={e => setJoinCode(e.target.value.slice(0,4))}
          style={{ width:"100%", padding:"20px", borderRadius:16, border:`2px solid ${joinError?"#7f1d1d":"var(--border)"}`, background:"var(--bg-card)", color:"#e2e8f0", fontSize:36, textAlign:"center" as const, fontFamily:"'Bebas Neue',cursive", letterSpacing:12, marginBottom:12 }}
        />
        {joinError && <div style={{ color:"#f87171", fontSize:12, marginBottom:12, textAlign:"center" as const }}>{joinError}</div>}

        <button onClick={joinSession} disabled={joinCode.length !== 4}
          style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", cursor:joinCode.length===4?"pointer":"not-allowed", background:joinCode.length===4?"linear-gradient(135deg,var(--accent),var(--accent2))":"#2a2a3e", color:"#fff", fontFamily:"'Bebas Neue',cursive", fontSize:17, letterSpacing:2 }}>
          REJOINDRE →
        </button>
      </div>
    </div>
  )

  // ── LOBBY ──
  if (phase === "lobby") return (
    <div style={BG}>
      <div style={W}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, letterSpacing:3, background:"linear-gradient(135deg,var(--accent),var(--accent2))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>🎵 BLIND TEST</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>

        {/* Code */}
        <div style={{ background:"var(--bg-card)", borderRadius:16, border:"1px solid var(--border)", padding:20, marginBottom:16, textAlign:"center" as const }}>
          <div style={{ fontSize:11, color:"#4b5563", fontWeight:700, letterSpacing:2, marginBottom:8 }}>CODE DE LA PARTIE</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:52, color:"var(--accent)", letterSpacing:12 }}>{sessionCode}</div>
          <div style={{ fontSize:12, color:"#6b7280", marginTop:4 }}>Dis ce code à tes amis</div>
        </div>

        {/* Catégorie */}
        <div style={{ background:"var(--bg-card)", borderRadius:14, border:"1px solid var(--border)", padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:24 }}>{catInfo?.emoji}</span>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:14, letterSpacing:2, color:"#e2e8f0" }}>{catInfo?.label}</div>
            <div style={{ fontSize:11, color:"#4b5563" }}>10 questions</div>
          </div>
        </div>

        {/* Joueurs */}
        <div style={{ background:"var(--bg-card)", borderRadius:14, border:"1px solid var(--border)", padding:14, marginBottom:16 }}>
          <div style={{ fontSize:10, color:"#4b5563", fontWeight:700, letterSpacing:1, marginBottom:10 }}>JOUEURS ({players.length})</div>
          {players.map((p, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:i<players.length-1?"1px solid var(--border)":"none" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--accent)" }}/>
              <span style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{p.pseudo || p.user_id}</span>
              {p.user_id === myUserId && <span style={{ fontSize:10, color:"var(--accent)", fontWeight:700 }}>MOI</span>}
              {isHost && p.user_id === myUserId && <span style={{ fontSize:10, color:"#f59e0b", fontWeight:700 }}>HOST</span>}
            </div>
          ))}
          {players.length < 2 && <div style={{ fontSize:11, color:"#4b5563", marginTop:8 }}>En attente d'autres joueurs...</div>}
        </div>

        {isHost && (
          <button onClick={startGame}
            style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,var(--accent),var(--accent2))", color:"#fff", fontFamily:"'Bebas Neue',cursive", fontSize:17, letterSpacing:2 }}>
            🚀 LANCER LA PARTIE
          </button>
        )}
        {!isHost && (
          <div style={{ textAlign:"center" as const, padding:16, color:"#4b5563", fontSize:13 }}>En attente que le host lance la partie...</div>
        )}
      </div>
    </div>
  )

  // ── ÉCOUTE (10s) ──
  if (phase === "listening" && q) return (
    <div style={BG}>
      <div style={W}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:18, letterSpacing:2, color:"var(--accent)" }}>{catInfo?.emoji} {catInfo?.label}</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:12, letterSpacing:1, color:"#4b5563" }}>{qIndex+1}/10</div>
        </div>

        {/* Vinyle + timer */}
        <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:16, margin:"20px 0" }}>
          <div style={{ position:"relative", width:160, height:160 }}>
            <div style={{ position:"absolute", inset:-6, borderRadius:"50%", border:"3px solid transparent", borderTopColor:"var(--accent)", borderRightColor:"var(--accent)", animation:"spin 1s linear infinite" }}/>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            <div style={{ width:160, height:160, borderRadius:"50%", background:"radial-gradient(circle,#1a1a2e 0%,#1a1a2e 18%,#0d0d18 18%,#0d0d18 22%,#1a1a2e 22%,#1a1a2e 38%,#0d0d18 38%,#0d0d18 42%,#1a1a2e 42%,#1a1a2e 100%)", border:"2px solid #2a2a3e", display:"flex", alignItems:"center", justifyContent:"center", animation:"spin 3s linear infinite", boxShadow:`0 0 30px color-mix(in srgb, var(--accent) 20%, transparent)` }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:"#13131f", border:"2px solid #2a2a3e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, animation:"spin 3s linear infinite reverse" }}>🎵</div>
            </div>
          </div>

          {/* Timer écoute */}
          <div style={{ background:"#13131f", borderRadius:14, border:"1px solid var(--border)", padding:"10px 24px", textAlign:"center" as const }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:11, color:"#4b5563", letterSpacing:2 }}>ÉCOUTE</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:40, color:"var(--accent)" }}>{listenTimer}s</div>
            <div style={{ fontSize:11, color:"#4b5563" }}>Les choix arrivent dans {listenTimer}s</div>
          </div>

          {/* EQ bars */}
          <div style={{ display:"flex", gap:3, alignItems:"flex-end", height:20 }}>
            {[14,20,10,18,14,22,12,18].map((h,i) => (
              <div key={i} style={{ width:5, borderRadius:3, background:`linear-gradient(to top,var(--accent),var(--accent2))`, height:h, animation:`eq ${0.3+i*0.05}s ease-in-out infinite alternate`, opacity:0.8 }}/>
            ))}
          </div>
          <style>{`@keyframes eq{from{height:4px}to{height:var(--h)}}`}</style>
        </div>

        {/* YouTube caché */}
        {ytId && (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0&start=60&mute=0&enablejsapi=1`}
            style={{ width:1, height:1, opacity:0, pointerEvents:"none" as const, position:"absolute" as const }}
            allow="autoplay; encrypted-media"
          />
        )}
      </div>
    </div>
  )

  // ── CHOIX (10s) ──
  if (phase === "choosing" && q) return (
    <div style={BG}>
      <div style={W}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:18, letterSpacing:2, color:"var(--accent)" }}>{catInfo?.emoji} {catInfo?.label}</div>
          <div style={{ background: chooseTimer<=3?"#1c0505":"#13131f", border:`1px solid ${chooseTimer<=3?"#7f1d1d":"var(--border)"}`, borderRadius:10, padding:"6px 14px", fontFamily:"'Bebas Neue',cursive", fontSize:18, color:chooseTimer<=3?"#f87171":"#f59e0b" }}>{chooseTimer}s</div>
        </div>

        {/* Titre */}
        <div style={{ background:"var(--bg-card)", borderRadius:14, border:"1px solid var(--border)", padding:"14px 16px", textAlign:"center" as const, marginBottom:16 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:11, color:"#4b5563", letterSpacing:2, marginBottom:4 }}>TITRE</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, color:"#e2e8f0", letterSpacing:2 }}>{q.title}</div>
          <div style={{ fontSize:11, color:"#6b7280", marginTop:4 }}>Qui est l'artiste ?</div>
        </div>

        {/* Choix */}
        <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
          {choices.map((choice, i) => (
            <button key={i} onClick={() => submitChoice(choice)} disabled={!!selected}
              style={{ padding:"14px 16px", borderRadius:14, border:`2px solid ${selected===choice?"var(--accent)":"var(--border)"}`, cursor:selected?"not-allowed":"pointer", background:selected===choice?"#1a1030":"var(--bg-card)", display:"flex", alignItems:"center", gap:12, width:"100%", transition:"all 0.15s" }}>
              <div style={{ width:28, height:28, borderRadius:8, background:selected===choice?"#3b1f6a":"#1e1e2e", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',cursive", fontSize:14, color:selected===choice?"var(--accent)":"#6b7280" }}>
                {["A","B","C","D"][i]}
              </div>
              <div style={{ fontSize:13, fontWeight:700, color: selected===choice?"var(--accent)":"#e2e8f0", flex:1, textAlign:"left" as const }}>{choice}</div>
            </button>
          ))}
        </div>

        {selected && (
          <div style={{ marginTop:14, padding:"12px 16px", borderRadius:12, background:"#1a1030", border:"1px solid var(--border)", textAlign:"center" as const, fontSize:13, color:"var(--accent)" }}>
            {selected === q.artist ? "✅ Bonne réponse ! En attente des autres..." : "❌ Raté ! En attente des autres..."}
          </div>
        )}
      </div>
    </div>
  )

  // ── RÉSULTAT ──
  if (phase === "reveal" && q) {
    const iAmFastest = fastestId === myUserId
    return (
      <div style={BG}>
        <div style={W}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:18, color:"var(--accent)" }}>{catInfo?.emoji} {catInfo?.label}</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:12, color:"#4b5563" }}>{qIndex+1}/10</div>
          </div>

          {/* Résultat */}
          <div style={{ textAlign:"center" as const, padding:"18px", borderRadius:16, background:fastestId?"#052e16":"#1c0505", border:`1px solid ${fastestId?"#166534":"#7f1d1d"}`, marginBottom:14 }}>
            <div style={{ fontSize:36, marginBottom:6 }}>{fastestId?"🏆":"😬"}</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, color:fastestId?"#4ade80":"#f87171", letterSpacing:2 }}>
              {fastestId ? (iAmFastest ? "T'ES LE PLUS RAPIDE !" : `${members.find(m=>m.user_id===fastestId)?.pseudo} A TROUVÉ !`) : "PERSONNE N'A TROUVÉ !"}
            </div>
            <div style={{ fontSize:14, color:"#9ca3af", marginTop:6 }}>{q.artist} — {q.title}</div>
          </div>

          {/* Choix révélés */}
          <div style={{ display:"flex", flexDirection:"column" as const, gap:8, marginBottom:14 }}>
            {choices.map((choice, i) => {
              const isCorrect = choice === q.artist
              const isWrong = choice === selected && !isCorrect
              return (
                <div key={i} style={{ padding:"12px 16px", borderRadius:14, border:`2px solid ${isCorrect?"#166534":isWrong?"#7f1d1d":"var(--border)"}`, background:isCorrect?"#052e16":isWrong?"#1c0505":"var(--bg-card)", display:"flex", alignItems:"center", gap:12, opacity:(!isCorrect&&!isWrong)?0.5:1 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:isCorrect?"#166534":isWrong?"#7f1d1d":"#1e1e2e", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',cursive", fontSize:14, color:isCorrect?"#4ade80":isWrong?"#f87171":"#6b7280" }}>
                    {["A","B","C","D"][i]}
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:isCorrect?"#4ade80":isWrong?"#f87171":"#9ca3af", flex:1 }}>{choice}</div>
                  {isCorrect&&<span>✅</span>}
                </div>
              )
            })}
          </div>

          {/* Distribution (si je suis le plus rapide) */}
          {iAmFastest && (
            <div style={{ background:"#1a1030", borderRadius:14, border:"1px solid #3b1f6a", padding:14, marginBottom:14 }}>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:13, color:"var(--accent)", letterSpacing:2, marginBottom:10 }}>🏆 DISTRIBUE 2 GORGÉES !</div>
              <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
                {members.filter(m => m.user_id !== myUserId).map(m => (
                  <button key={m.user_id} onClick={() => handleDistribute(m.user_id)}
                    style={{ padding:"12px 16px", borderRadius:12, border:"1px solid #3b1f6a", cursor:"pointer", background:distributeTarget===m.user_id?"#2d1060":"#13131f", display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:18 }}>{m.avatar_emoji||"🍺"}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:"#e2e8f0", flex:1, textAlign:"left" as const }}>{m.pseudo}</span>
                    <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:12, color:"var(--accent)" }}>2 GORGÉES →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bouton suivant (host, si pas le plus rapide ou déjà distribué) */}
          {isHost && !iAmFastest && (
            <button onClick={nextQuestion}
              style={{ width:"100%", padding:"14px", borderRadius:14, border:"none", cursor:"pointer", background:`linear-gradient(135deg,var(--accent),var(--accent2))`, color:"#fff", fontFamily:"'Bebas Neue',cursive", fontSize:16, letterSpacing:2 }}>
              {qIndex+1>=questions.length?"VOIR LE SCORE →":"QUESTION SUIVANTE →"}
            </button>
          )}
          {!isHost && <div style={{ textAlign:"center" as const, color:"#4b5563", fontSize:12, marginTop:8 }}>En attente du host...</div>}
        </div>
      </div>
    )
  }

  // ── FINISHED ──
  if (phase === "finished") {
    const sorted = [...members].sort((a,b)=>(scores[b.user_id]||0)-(scores[a.user_id]||0))
    return (
      <div style={BG}>
        <div style={W}>
          <div style={{ textAlign:"center" as const, padding:"20px", borderRadius:18, background:"var(--bg-card)", border:"1px solid var(--border)", marginBottom:14 }}>
            <div style={{ fontSize:36, marginBottom:8 }}>🏆</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, color:"var(--accent)", letterSpacing:3 }}>FIN DU BLIND TEST !</div>
            <div style={{ fontSize:12, color:"#6b7280", marginTop:4 }}>{catInfo?.emoji} {catInfo?.label}</div>
          </div>

          <div style={{ background:"var(--bg-card)", borderRadius:16, border:"1px solid var(--border)", overflow:"hidden", marginBottom:14 }}>
            {sorted.map((m,i) => (
              <div key={m.user_id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:i<sorted.length-1?"1px solid var(--border)":"none", background:m.user_id===myUserId?"#1a1030":"transparent" }}>
                <div style={{ fontSize:20 }}>{["🥇","🥈","🥉"][i]||`${i+1}`}</div>
                <span style={{ fontSize:18 }}>{m.avatar_emoji||"🍺"}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:m.user_id===myUserId?"var(--accent)":"#e2e8f0" }}>{m.pseudo}</div>
                </div>
                <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:18, color:"#4ade80" }}>{scores[m.user_id]||0}/10</div>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => { setPhase("menu"); setQuestions([]); setQIndex(0); setScores({}) }}
              style={{ flex:1, padding:"14px", borderRadius:14, border:"none", cursor:"pointer", background:`linear-gradient(135deg,var(--accent),var(--accent2))`, color:"#fff", fontFamily:"'Bebas Neue',cursive", fontSize:15, letterSpacing:2 }}>
              🔄 REJOUER
            </button>
            <button onClick={onClose}
              style={{ flex:1, padding:"14px", borderRadius:14, border:"1px solid var(--border)", cursor:"pointer", background:"transparent", color:"#6b7280", fontFamily:"'Bebas Neue',cursive", fontSize:15, letterSpacing:2 }}>
              FERMER
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
