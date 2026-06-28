export interface Genre {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
  region: string;
  era: string;
  description: string;
  subgenres: string[];
  relatedGenres: string[];
}

const GENRES: Genre[] = [
  // ── Western Popular ──
  { id: 'rock', name: 'Rock', slug: 'rock', parent: null, region: 'Global', era: '1950s–present', description: 'Guitar-driven popular music rooted in rock and roll', subgenres: ['classic-rock','alt-rock','indie-rock','hard-rock','prog-rock','psychedelic-rock','garage-rock','post-rock','stoner-rock','southern-rock','surf-rock','glam-rock','arena-rock','heartland-rock','blues-rock','folk-rock','country-rock','soft-rock','math-rock','noise-rock','shoegaze','britpop','grunge','emo'], relatedGenres: ['blues','punk','metal'] },
  { id: 'pop', name: 'Pop', slug: 'pop', parent: null, region: 'Global', era: '1950s–present', description: 'Mainstream popular music emphasizing melody and hooks', subgenres: ['synth-pop','electropop','dance-pop','dream-pop','chamber-pop','art-pop','indie-pop','power-pop','bubblegum-pop','teen-pop','adult-contemporary','europop','sophisti-pop','hyperpop','dark-pop','bedroom-pop'], relatedGenres: ['rock','electronic','r-and-b'] },
  { id: 'hip-hop', name: 'Hip-Hop', slug: 'hip-hop', parent: null, region: 'North America', era: '1970s–present', description: 'Rhythmic vocal style over beats, originating in the Bronx', subgenres: ['trap','boom-bap','gangsta-rap','conscious-hip-hop','lo-fi-hip-hop','cloud-rap','drill','grime','crunk','chopped-and-screwed','jazz-rap','mumble-rap','horrorcore','hyphy','phonk','emo-rap','alternative-hip-hop'], relatedGenres: ['r-and-b','electronic','funk'] },
  { id: 'r-and-b', name: 'R&B', slug: 'r-and-b', parent: null, region: 'North America', era: '1940s–present', description: 'Rhythm and blues, blending soulful vocals with groove', subgenres: ['contemporary-r-and-b','neo-soul','new-jack-swing','quiet-storm','alternative-r-and-b','pnb-r-and-b'], relatedGenres: ['soul','hip-hop','funk','gospel'] },
  { id: 'electronic', name: 'Electronic', slug: 'electronic', parent: null, region: 'Global', era: '1970s–present', description: 'Music produced primarily with electronic instruments and technology', subgenres: ['house','techno','trance','dubstep','drum-and-bass','ambient','idm','edm','electro','breakbeat','downtempo','garage-uk','hardstyle','industrial-electronic','future-bass','lo-fi','vaporwave','witch-house','uk-bass','jungle','gabber','happy-hardcore','progressive-house','deep-house','tech-house','minimal-techno','acid-house','detroit-techno','berlin-techno','dub-techno'], relatedGenres: ['pop','hip-hop'] },
  { id: 'jazz', name: 'Jazz', slug: 'jazz', parent: null, region: 'North America', era: '1900s–present', description: 'Improvisational music originating from African American communities', subgenres: ['bebop','cool-jazz','hard-bop','free-jazz','fusion','smooth-jazz','swing','dixieland','modal-jazz','post-bop','acid-jazz','nu-jazz','gypsy-jazz','latin-jazz','avant-garde-jazz','spiritual-jazz','ethio-jazz','jazz-funk'], relatedGenres: ['blues','soul','classical'] },
  { id: 'blues', name: 'Blues', slug: 'blues', parent: null, region: 'North America', era: '1870s–present', description: 'African American music form built on blue notes and call-and-response', subgenres: ['delta-blues','chicago-blues','electric-blues','country-blues','piedmont-blues','texas-blues','jump-blues','british-blues','hill-country-blues','swamp-blues'], relatedGenres: ['rock','jazz','soul','r-and-b'] },
  { id: 'country', name: 'Country', slug: 'country', parent: null, region: 'North America', era: '1920s–present', description: 'Roots music of the American South, blending folk and blues', subgenres: ['outlaw-country','alt-country','country-pop','bluegrass','honky-tonk','western-swing','americana','neo-traditional-country','bro-country','country-rock','red-dirt','texas-country','progressive-bluegrass'], relatedGenres: ['folk','rock','blues'] },
  { id: 'classical', name: 'Classical', slug: 'classical', parent: null, region: 'Europe', era: '1600s–present', description: 'Western art music tradition spanning centuries', subgenres: ['baroque','romantic','modern-classical','contemporary-classical','minimalism','impressionism','neoclassical','opera','chamber-music','symphonic','choral','early-music','serial-music'], relatedGenres: ['jazz','ambient'] },
  { id: 'metal', name: 'Metal', slug: 'metal', parent: null, region: 'Global', era: '1960s–present', description: 'Heavy, distorted guitar-driven music', subgenres: ['heavy-metal','thrash-metal','death-metal','black-metal','doom-metal','power-metal','progressive-metal','nu-metal','metalcore','deathcore','symphonic-metal','folk-metal','sludge-metal','groove-metal','post-metal','djent','melodic-death-metal','speed-metal','stoner-metal','industrial-metal','gothic-metal','viking-metal','pirate-metal'], relatedGenres: ['rock','punk','hard-rock'] },
  { id: 'punk', name: 'Punk', slug: 'punk', parent: null, region: 'North America / Europe', era: '1970s–present', description: 'Fast, aggressive music rejecting mainstream conventions', subgenres: ['hardcore-punk','pop-punk','post-punk','anarcho-punk','crust-punk','skate-punk','street-punk','oi','riot-grrrl','straight-edge','d-beat','horror-punk'], relatedGenres: ['rock','metal','emo'] },
  { id: 'soul', name: 'Soul', slug: 'soul', parent: null, region: 'North America', era: '1950s–present', description: 'African American music combining gospel with rhythm and blues', subgenres: ['northern-soul','southern-soul','philly-soul','blue-eyed-soul','psychedelic-soul','deep-soul','neo-soul','nu-soul'], relatedGenres: ['r-and-b','funk','gospel','blues'] },
  { id: 'funk', name: 'Funk', slug: 'funk', parent: null, region: 'North America', era: '1960s–present', description: 'Groove-driven music emphasizing rhythmic bass and drums', subgenres: ['p-funk','boogie','electro-funk','go-go','jazz-funk','funk-rock','synth-funk','afro-funk'], relatedGenres: ['soul','r-and-b','disco','hip-hop'] },
  { id: 'disco', name: 'Disco', slug: 'disco', parent: null, region: 'Global', era: '1970s–1980s', description: 'Dance music with four-on-the-floor beat and orchestral elements', subgenres: ['eurodisco','italo-disco','nu-disco','space-disco','disco-funk','hi-nrg'], relatedGenres: ['funk','electronic','pop'] },
  { id: 'reggae', name: 'Reggae', slug: 'reggae', parent: null, region: 'Caribbean', era: '1960s–present', description: 'Jamaican music with offbeat rhythm and Rastafari influences', subgenres: ['roots-reggae','dub','dancehall','lovers-rock','ragga','digital-reggae','reggae-fusion','steppers'], relatedGenres: ['ska','rocksteady','hip-hop'] },
  { id: 'folk', name: 'Folk', slug: 'folk', parent: null, region: 'Global', era: 'Traditional–present', description: 'Traditional music passed through generations', subgenres: ['contemporary-folk','anti-folk','psych-folk','neo-folk','indie-folk','progressive-folk','folk-punk','folk-metal','protest-folk','singer-songwriter'], relatedGenres: ['country','acoustic','celtic'] },
  { id: 'gospel', name: 'Gospel', slug: 'gospel', parent: null, region: 'North America', era: '1930s–present', description: 'Christian devotional music with roots in African American tradition', subgenres: ['traditional-gospel','contemporary-gospel','southern-gospel','urban-gospel','gospel-hip-hop','praise-and-worship'], relatedGenres: ['soul','r-and-b','blues'] },
  { id: 'world', name: 'World Music', slug: 'world', parent: null, region: 'Global', era: 'Traditional–present', description: 'Umbrella category for traditional and contemporary non-Western music', subgenres: ['afrobeat','afropop','highlife','mbalax','soukous','juju','fuji','apala','gnawa','rai','chaabi','taarab','benga','kwaito','amapiano','gqom','isicathamiya','chimurenga','desert-blues','tuareg-blues','ethio-jazz','malagasy','griot'], relatedGenres: ['folk','jazz','electronic'] },
  // ── Latin ──
  { id: 'latin', name: 'Latin', slug: 'latin', parent: null, region: 'Latin America', era: 'Traditional–present', description: 'Music from Latin American and Iberian cultures', subgenres: ['reggaeton','salsa','bachata','merengue','cumbia','vallenato','son-cubano','bossa-nova','samba','forro','sertanejo','mpb','tropicalia','tango','milonga','corrido','norteno','banda','ranchera','mariachi','huayno','chicha','champeta','dembow','latin-trap','latin-pop','latin-rock','punta','garifuna','plena','bomba'], relatedGenres: ['pop','hip-hop','world'] },
  // ── Asian ──
  { id: 'k-pop', name: 'K-Pop', slug: 'k-pop', parent: null, region: 'East Asia', era: '1990s–present', description: 'South Korean popular music combining pop, hip-hop, and electronic', subgenres: ['k-hip-hop','k-r-and-b','k-rock','k-indie','k-ballad','trot'], relatedGenres: ['pop','hip-hop','electronic'] },
  { id: 'j-pop', name: 'J-Pop', slug: 'j-pop', parent: null, region: 'East Asia', era: '1990s–present', description: 'Japanese popular music', subgenres: ['j-rock','visual-kei','city-pop','enka','j-hip-hop','anime-music','shibuya-kei','kawaii-metal','vocaloid'], relatedGenres: ['pop','rock','electronic'] },
  { id: 'bollywood', name: 'Bollywood / Filmi', slug: 'bollywood', parent: null, region: 'South Asia', era: '1930s–present', description: 'Music from Indian cinema', subgenres: ['item-song','ghazal','qawwali-film','indie-indian','sufi-pop','indi-pop','tollywood','kollywood'], relatedGenres: ['classical-indian','folk'] },
  { id: 'classical-indian', name: 'Indian Classical', slug: 'classical-indian', parent: null, region: 'South Asia', era: 'Ancient–present', description: 'Traditional art music of the Indian subcontinent', subgenres: ['hindustani','carnatic','dhrupad','khayal','thumri','tarana','kriti','raga','jugalbandi'], relatedGenres: ['bollywood','world'] },
  { id: 'c-pop', name: 'C-Pop', slug: 'c-pop', parent: null, region: 'East Asia', era: '1920s–present', description: 'Chinese popular music including Mandopop and Cantopop', subgenres: ['mandopop','cantopop','hokkien-pop','c-rock','c-hip-hop','c-electronic'], relatedGenres: ['pop','k-pop'] },
  // ── Middle East & North Africa ──
  { id: 'arabic', name: 'Arabic Music', slug: 'arabic', parent: null, region: 'Middle East / North Africa', era: 'Ancient–present', description: 'Music from the Arab world spanning classical to modern', subgenres: ['khaleeji','levantine','egyptian-pop','mahraganat','dabke','tarab','maqam','andalusi','gnawa','rai','sha3bi','Gulf-pop'], relatedGenres: ['world','turkish'] },
  { id: 'turkish', name: 'Turkish Music', slug: 'turkish', parent: null, region: 'Middle East', era: 'Ancient–present', description: 'Music from Turkey blending Ottoman classical and Anatolian folk', subgenres: ['turkish-pop','arabesk','turkish-folk','ottoman-classical','anatolian-rock','turkish-hip-hop'], relatedGenres: ['arabic','world'] },
  { id: 'persian', name: 'Persian Music', slug: 'persian', parent: null, region: 'Middle East', era: 'Ancient–present', description: 'Traditional and modern Iranian music', subgenres: ['persian-classical','persian-pop','persian-hip-hop','persian-folk'], relatedGenres: ['arabic','world'] },
  // ── Caribbean ──
  { id: 'dancehall', name: 'Dancehall', slug: 'dancehall', parent: 'reggae', region: 'Caribbean', era: '1970s–present', description: 'Jamaican urban popular music with digital rhythms', subgenres: ['digital-dancehall','bashment','afro-dancehall'], relatedGenres: ['reggae','soca','hip-hop'] },
  { id: 'soca', name: 'Soca', slug: 'soca', parent: null, region: 'Caribbean', era: '1970s–present', description: 'Trinidadian dance music blending calypso with Indian rhythms', subgenres: ['power-soca','groovy-soca','chutney-soca','bouyon','zouk'], relatedGenres: ['calypso','dancehall','reggae'] },
  { id: 'calypso', name: 'Calypso', slug: 'calypso', parent: null, region: 'Caribbean', era: '1900s–present', description: 'Afro-Caribbean music from Trinidad and Tobago', subgenres: ['kaiso','rapso','extempo'], relatedGenres: ['soca','reggae'] },
  // ── African ──
  { id: 'afrobeat', name: 'Afrobeat', slug: 'afrobeat', parent: 'world', region: 'West Africa', era: '1960s–present', description: 'Nigerian fusion of funk, jazz, and Yoruba music', subgenres: ['afrobeats','afro-fusion','alte','afro-house','afro-soul'], relatedGenres: ['highlife','funk','jazz'] },
  { id: 'highlife', name: 'Highlife', slug: 'highlife', parent: 'world', region: 'West Africa', era: '1920s–present', description: 'Ghanaian/Nigerian genre blending Western instruments with local melodies', subgenres: ['guitar-highlife','palm-wine','burger-highlife','gospel-highlife'], relatedGenres: ['afrobeat','juju','soukous'] },
  { id: 'amapiano', name: 'Amapiano', slug: 'amapiano', parent: 'world', region: 'Southern Africa', era: '2010s–present', description: 'South African house subgenre with jazz, lounge, and deep bass', subgenres: ['private-school-amapiano','dust-amapiano'], relatedGenres: ['kwaito','gqom','deep-house'] },
  // ── European ──
  { id: 'flamenco', name: 'Flamenco', slug: 'flamenco', parent: null, region: 'Europe', era: '1700s–present', description: 'Andalusian art form blending guitar, song, and dance', subgenres: ['nuevo-flamenco','flamenco-fusion','flamenco-pop','flamenco-jazz'], relatedGenres: ['latin','folk'] },
  { id: 'fado', name: 'Fado', slug: 'fado', parent: null, region: 'Europe', era: '1820s–present', description: 'Portuguese genre expressing longing and melancholy', subgenres: ['traditional-fado','novo-fado'], relatedGenres: ['folk','bossa-nova'] },
  { id: 'celtic', name: 'Celtic', slug: 'celtic', parent: null, region: 'Europe', era: 'Traditional–present', description: 'Traditional music of Celtic regions', subgenres: ['irish-traditional','scottish-folk','breton','galician','celtic-rock','celtic-punk'], relatedGenres: ['folk','world'] },
  { id: 'klezmer', name: 'Klezmer', slug: 'klezmer', parent: null, region: 'Europe', era: 'Medieval–present', description: 'Ashkenazi Jewish instrumental tradition', subgenres: ['neo-klezmer','klezmer-fusion'], relatedGenres: ['folk','jazz','world'] },
  { id: 'ska', name: 'Ska', slug: 'ska', parent: null, region: 'Caribbean / Europe', era: '1950s–present', description: 'Jamaican music with walking bass and offbeat rhythms', subgenres: ['two-tone','ska-punk','third-wave-ska','rocksteady'], relatedGenres: ['reggae','punk'] },
  // ── Additional ──
  { id: 'new-age', name: 'New Age', slug: 'new-age', parent: null, region: 'Global', era: '1970s–present', description: 'Relaxation and meditation music', subgenres: ['celtic-new-age','space-music','healing','nature-sounds','meditation'], relatedGenres: ['ambient','classical'] },
  { id: 'soundtrack', name: 'Soundtrack', slug: 'soundtrack', parent: null, region: 'Global', era: '1900s–present', description: 'Music composed for film, TV, and games', subgenres: ['film-score','tv-score','video-game-music','anime-ost','musical-theatre'], relatedGenres: ['classical','electronic'] },
  { id: 'experimental', name: 'Experimental', slug: 'experimental', parent: null, region: 'Global', era: '1950s–present', description: 'Avant-garde and boundary-pushing music', subgenres: ['noise','drone','musique-concrete','glitch','sound-art','field-recordings','tape-music','electroacoustic'], relatedGenres: ['electronic','classical','ambient'] },
  { id: 'children', name: "Children's", slug: 'children', parent: null, region: 'Global', era: 'Traditional–present', description: 'Music for young audiences', subgenres: ['nursery-rhymes','educational-music','lullabies'], relatedGenres: ['pop','folk'] },
  { id: 'comedy', name: 'Comedy / Novelty', slug: 'comedy', parent: null, region: 'Global', era: '1900s–present', description: 'Humorous music and parody', subgenres: ['parody','nerdcore','comedy-rap','novelty-songs'], relatedGenres: ['pop','hip-hop'] },
  { id: 'ambient', name: 'Ambient', slug: 'ambient', parent: 'electronic', region: 'Global', era: '1970s–present', description: 'Atmospheric music emphasizing tone and mood over rhythm', subgenres: ['dark-ambient','ambient-dub','space-ambient','ambient-techno','ambient-house'], relatedGenres: ['electronic','new-age','experimental'] },
  { id: 'gamelan', name: 'Gamelan', slug: 'gamelan', parent: 'world', region: 'Southeast Asia', era: 'Ancient–present', description: 'Indonesian ensemble music with metallophones and gongs', subgenres: ['javanese-gamelan','balinese-gamelan'], relatedGenres: ['world','classical'] },
];

export class GenreTaxonomy {
  private genres: Map<string, Genre>;

  constructor() {
    this.genres = new Map(GENRES.map((g) => [g.id, g]));
  }

  getGenre(id: string): Genre | undefined {
    return this.genres.get(id);
  }

  getAllGenres(): Genre[] {
    return Array.from(this.genres.values());
  }

  getRootGenres(): Genre[] {
    return this.getAllGenres().filter((g) => g.parent === null);
  }

  getSubgenres(genreId: string): string[] {
    return this.genres.get(genreId)?.subgenres ?? [];
  }

  getGenresByRegion(region: string): Genre[] {
    const lower = region.toLowerCase();
    return this.getAllGenres().filter((g) => g.region.toLowerCase().includes(lower));
  }

  searchGenres(query: string): Genre[] {
    const lower = query.toLowerCase();
    return this.getAllGenres().filter(
      (g) =>
        g.name.toLowerCase().includes(lower) ||
        g.description.toLowerCase().includes(lower) ||
        g.subgenres.some((s) => s.includes(lower)),
    );
  }

  buildTaxonomyTree(): Record<string, Genre & { children: Genre[] }> {
    const tree: Record<string, Genre & { children: Genre[] }> = {};
    for (const genre of this.getAllGenres()) {
      tree[genre.id] = { ...genre, children: [] };
    }
    for (const genre of this.getAllGenres()) {
      if (genre.parent && tree[genre.parent]) {
        tree[genre.parent].children.push(tree[genre.id]);
      }
    }
    return tree;
  }

  getRelatedGenres(genreId: string): Genre[] {
    const genre = this.genres.get(genreId);
    if (!genre) return [];
    return genre.relatedGenres
      .map((id) => this.genres.get(id))
      .filter((g): g is Genre => g !== undefined);
  }

  get count(): number {
    return this.genres.size;
  }

  get totalSubgenres(): number {
    let total = 0;
    for (const genre of this.genres.values()) {
      total += genre.subgenres.length;
    }
    return total;
  }
}
