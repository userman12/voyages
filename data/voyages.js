/**
 * Voyages — expedition dataset.
 *
 * Editorial rules:
 *  - nothing invented: where the historiography is uncertain we say "about",
 *    "estimated", "reported by the sources", or the field is left out;
 *  - routes are teaching reconstructions: waypoints are documented places, the
 *    `via` points exist only to keep the track at sea;
 *  - dates are those given in the logs and chronicles; for expeditions before
 *    1582 the calendar is the Julian one in use at the time.
 *
 * Waypoint fields:
 *   lat, lon      position of the stop
 *   date          arrival (ISO)
 *   departDate    departure (optional): between the two dates the fleet stays in port
 *   via           sailing-only points for the leg leading to this stop
 *   glow          radius in km of the landfall that lights up on arrival
 *   approx        true if the date is reconstructed or seasonal
 */

export const VOYAGES = [
  /* ==================================================================== */
  {
    id: 'columbus-1492',
    title: 'Columbus\'s First Voyage',
    subtitle: 'Across the Atlantic, to islands already inhabited',
    commanders: 'Christopher Columbus',
    yearsLabel: '1492 – 1493',
    accent: '#b0322a',
    playbackSeconds: 78,
    context:
      'Columbus is looking for a westward route to Asia and badly underestimates the size of the Earth. ' +
      'He lands instead in the Antilles, in archipelagos settled for centuries by the Taíno and the Lucayan.',
    fleet: {
      ships: '3 ships',
      kinds: 'Santa María (nao), Pinta and Niña (caravels)',
      crew: 'about 90 men',
      crewNote: 'an estimate: the complete crew rolls have not survived'
    },
    sponsor: {
      name: 'Crown of Castile — Isabella I and Ferdinand II',
      note: 'Part of the funding is arranged by Luis de Santángel, an Aragonese treasurer; shipowners from Palos also contribute.'
    },
    goals: 'Reach the Indies by sailing west, open a trade route, take possession of any lands encountered in the name of the Crown.',
    waypoints: [
      {
        name: 'Palos de la Frontera', place: 'Andalusia, Castile',
        lat: 37.23, lon: -6.89, date: '1492-08-03',
        title: 'Departure from Palos',
        text: 'Three ships leave the harbour of Palos at dawn. The planned course runs south-west, towards the Canaries, to pick up the steady Atlantic winds.'
      },
      {
        name: 'La Gomera', place: 'Canary Islands',
        lat: 28.09, lon: -17.11, date: '1492-08-12', departDate: '1492-09-06',
        via: [[36.6, -7.1], [34.5, -9.8]],
        glow: 260,
        title: 'Stopover in the Canaries',
        text: 'Almost a month in port: the Pinta\'s rudder is repaired and the Niña is re-rigged. The Canaries are already a Castilian base after decades of conquest.'
      },
      {
        name: 'Guanahaní', place: 'Bahamas — island not identified with certainty',
        lat: 24.05, lon: -74.50, date: '1492-10-12', departDate: '1492-10-14',
        via: [[30.5, -25], [27.5, -45], [25.5, -62]],
        glow: 700,
        title: 'First landfall, 12 October',
        text: 'After thirty-three days at sea the fleet reaches an island its inhabitants call Guanahaní. Columbus renames it San Salvador. Which island it was remains disputed.'
      },
      {
        name: 'North-east coast of Cuba', place: 'Cuba',
        lat: 20.90, lon: -75.80, date: '1492-10-28', departDate: '1492-12-04',
        via: [[23.6, -75.2], [22.4, -75.9], [21.3, -76.4]],
        glow: 620,
        title: 'Cuba, not Cathay',
        text: 'Columbus is looking for the Asian mainland and the cities described by Marco Polo. He finds Taíno villages, fields of cassava and maize, and the first tobacco leaves seen by Europeans.'
      },
      {
        name: 'North coast of Hispaniola', place: 'Haiti / Dominican Republic',
        lat: 19.80, lon: -73.38, date: '1492-12-06', departDate: '1492-12-20',
        glow: 520,
        title: 'Hispaniola',
        text: 'The island the Taíno call Ayiti is renamed La Española. Trading begins: metal and glass objects for worked gold, cotton and food.'
      },
      {
        name: 'La Navidad', place: 'North coast of Haiti',
        lat: 19.75, lon: -72.20, date: '1492-12-25', departDate: '1493-01-04',
        title: 'Loss of the Santa María',
        text: 'The flagship runs aground on a coral bank on Christmas night. Her timbers are used to build a small fort: about thirty-nine men stay behind.'
      },
      {
        name: 'Golfo de las Flechas', place: 'Samaná Bay',
        lat: 19.20, lon: -69.33, date: '1493-01-13', departDate: '1493-01-16',
        via: [[20.1, -71.3], [19.95, -70.0]],
        title: 'First armed clash',
        text: 'On the Samaná peninsula Columbus\'s party clashes with the Ciguayo. It is the first documented armed conflict between Europeans and Caribbean peoples on this voyage.'
      },
      {
        name: 'Santa Maria', place: 'Azores, Portugal',
        lat: 36.98, lon: -25.10, date: '1493-02-18', departDate: '1493-02-24',
        via: [[26, -64], [31, -50], [35, -38]],
        title: 'Storm on the way home',
        text: 'The return course runs north to find westerly winds. A storm separates the Niña and the Pinta; part of the crew is detained ashore by the Portuguese authorities.'
      },
      {
        name: 'Lisbon', place: 'Portugal',
        lat: 38.71, lon: -9.14, date: '1493-03-04', departDate: '1493-03-13',
        title: 'Forced call at Lisbon',
        text: 'Bad weather drives the Niña into the Tagus. Columbus is received by John II of Portugal: news of the landfall reaches a rival court before the Castilian one.'
      },
      {
        name: 'Palos de la Frontera', place: 'Andalusia, Castile',
        lat: 37.23, lon: -6.89, date: '1493-03-15',
        via: [[38.3, -9.7], [36.8, -8.0]],
        title: 'Return',
        text: 'The Niña returns to Palos; la Pinta arriva lo stesso giorno a Bayona. Colombo porta con sé oro, piante, pappagalli e alcune persone taíno condotte in Europa contro la loro volontà.'
      }
    ],
    outcome: {
      achieved: [
        'First documented Atlantic crossing with a return, followed by continuous contact between Europe and the Americas',
        'Rough survey of the northern coasts of the Bahamas, Cuba and Hispaniola',
        'Identification of the wind system that would make the route repeatable: trade winds westward, westerlies at higher latitudes for the return'
      ],
      exchanged: [
        'To Europe: worked gold, cotton, tobacco, maize, ají; several Taíno people deported',
        'To the Caribbean: glass objects, hawk\'s bells, metal tools — and, unintentionally, pathogens'
      ],
      claimed: 'The islands visited are declared possessions of the Crown of Castile, with no recognition of the peoples living there.',
      cost: 'The Santa María is lost. The garrison at La Navidad is destroyed before Columbus returns in 1493.'
    },
    legacy:
      'The voyage opens the Columbian Exchange: plants, animals, people and diseases begin moving steadily between the hemispheres, reshaping diets and economies worldwide. ' +
      'It also opens the colonial period in the Caribbean.',
    humanImpact:
      'Over the following decades the Taíno population of Hispaniola collapses through epidemics of diseases they had no immunity to, forced labour and the encomienda, violence and social breakdown. ' +
      'Demographic estimates vary widely among scholars, but the collapse is documented and rapid. The first voyage does not cause it alone: it opens the sequence.',
    uncertainty:
      'Guanahaní has not been identified with certainty: several Bahamian islands have been proposed. Crew figures are estimates.',
    sources: [
      { label: 'Library of Congress — 1492: An Ongoing Voyage', url: 'https://www.loc.gov/exhibits/1492/' },
      { label: 'Encyclopaedia Britannica — Christopher Columbus', url: 'https://www.britannica.com/biography/Christopher-Columbus' },
      { label: 'Smithsonian NMAI — Taíno: Native Heritage and Identity', url: 'https://americanindian.si.edu/explore/exhibitions' },
      { label: 'World History Encyclopedia — Columbian Exchange', url: 'https://www.worldhistory.org/Columbian_Exchange/' }
    ]
  },

  /* ==================================================================== */
  {
    id: 'magellan-1519',
    title: 'Magellan and Elcano',
    subtitle: 'The first known circumnavigation',
    commanders: 'Ferdinand Magellan, then Juan Sebastián Elcano',
    yearsLabel: '1519 – 1522',
    accent: '#2b5f8f',
    playbackSeconds: 96,
    context:
      'A Castilian expedition looks for a westward route to the spice islands, bypassing the Portuguese monopoly. ' +
      'Magellan dies halfway: it is Elcano who brings a single ship back to Spain, three years later.',
    fleet: {
      ships: '5 ships',
      kinds: 'Trinidad, San Antonio, Concepción, Victoria, Santiago',
      crew: 'about 240–270 men at departure',
      crewNote: 'the registers disagree; 18 men complete the circumnavigation aboard the Victoria'
    },
    sponsor: {
      name: 'Crown of Castile — Charles I',
      note: 'Private capital coordinated by the merchant Cristóbal de Haro; the stated aim was to reach the Moluccas while staying inside the Castilian hemisphere of Tordesillas.'
    },
    goals: 'Find a western passage to the Moluccas, load spices, establish which islands fell within the zone assigned to Castile.',
    waypoints: [
      {
        name: 'Sanlúcar de Barrameda', place: 'Andalusia, Castile',
        lat: 36.78, lon: -6.35, date: '1519-09-20',
        title: 'Five ships sail',
        text: 'The fleet leaves Sanlúcar after weeks of preparation in Seville. On board: two years of supplies and a crew of at least eight different nationalities.'
      },
      {
        name: 'Tenerife', place: 'Canary Islands',
        lat: 28.47, lon: -16.25, date: '1519-09-26', departDate: '1519-10-03',
        via: [[36.3, -6.9], [33, -10]],
        title: 'Last Atlantic call',
        text: 'Water, pitch and fresh provisions are taken on. Here Magellan is warned that some Castilian captains are already planning to challenge his command.'
      },
      {
        name: 'Guanabara Bay', place: 'Rio de Janeiro, Brazil',
        lat: -22.91, lon: -43.17, date: '1519-12-13', departDate: '1519-12-27',
        via: [[12, -22], [2, -25], [-8, -31], [-16, -36.0], [-20, -38.6], [-23.3, -42.2]],
        glow: 450,
        title: 'A stop in Brazil',
        text: 'Two weeks of rest and trade with the Tupi of the bay. Under Tordesillas the coast is Portuguese territory: the fleet avoids settlements and puts to sea again quickly.'
      },
      {
        name: 'Río de la Plata', place: 'Estuary between Uruguay and Argentina',
        lat: -34.90, lon: -56.19, date: '1520-01-11', departDate: '1520-02-02',
        via: [[-24, -43.5], [-27.5, -47], [-31, -50.5]],
        title: 'An estuary, not a strait',
        text: 'Weeks of soundings working up the fresh water. The wide opening leads to no other ocean: the search for the passage must continue southward.'
      },
      {
        name: 'Puerto San Julián', place: 'Patagonia, Argentina',
        lat: -49.31, lon: -67.72, date: '1520-03-31', departDate: '1520-08-24',
        via: [[-38, -56.3], [-42, -60], [-46, -64]],
        title: 'Wintering and mutiny',
        text: 'Five months of southern winter on reduced rations. Three captains rebel: the revolt is put down with executions and maroonings. The Santiago is wrecked while scouting.'
      },
      {
        name: 'Cabo Vírgenes', place: 'Entrance to the strait',
        lat: -52.34, lon: -68.35, date: '1520-10-21', departDate: '1520-10-24',
        glow: 380,
        title: 'The mouth',
        text: 'An inlet that stays salt and deep: this is the passage they were looking for. During the exploration the San Antonio deserts and sails home with most of the provisions.'
      },
      {
        name: 'Cabo Deseado', place: 'Exit into the Pacific',
        lat: -52.75, lon: -74.72, date: '1520-11-28',
        via: [[-52.5, -69.5], [-52.9, -70.9], [-53.3, -71.9], [-53.5, -73.2]],
        title: 'Into the "peaceful" sea',
        text: 'Thirty-eight days among channels, tides and headwinds. At the exit an unusually calm ocean opens up: hence the name. Its real size is still unknown.'
      },
      {
        name: 'Guam', place: 'Mariana Islands',
        lat: 13.47, lon: 144.75, date: '1521-03-06', departDate: '1521-03-09',
        via: [[-40, -95], [-25, -125], [-10, -155], [0, 175], [8, 160]],
        glow: 260,
        title: 'Three months without land',
        text: 'The Pacific crossing takes almost four months. Scurvy kills dozens of men. The encounter with the Chamorro turns violent and ends with a village burned.'
      },
      {
        name: 'Homonhon', place: 'Eastern Philippines',
        lat: 10.75, lon: 125.70, date: '1521-03-16', departDate: '1521-04-04',
        via: [[12, 138]],
        glow: 420,
        title: 'Arrival in the Philippines',
        text: 'Water, fruit and help from the islanders. Enrique, an interpreter from the Malay archipelago held in slavery, makes himself understood: the world closes.'
      },
      {
        name: 'Cebu', place: 'Philippines',
        lat: 10.32, lon: 123.89, date: '1521-04-07', departDate: '1521-04-27',
        title: 'Alliances and baptisms',
        text: 'Magellan makes a pact with rajah Humabon and promotes conversions to Christianity. The agreement carries a commitment to intervene in local conflicts.'
      },
      {
        name: 'Mactan', place: 'Philippines',
        lat: 10.31, lon: 124.02, date: '1521-04-27', departDate: '1521-05-01',
        title: 'Magellan is killed',
        text: 'The attack on Mactan, led by Lapulapu, fails at the water\'s edge. Magellan is killed. Command changes hands several times and two ships are abandoned.'
      },
      {
        name: 'Tidore', place: 'Moluccas',
        lat: 0.69, lon: 127.40, date: '1521-11-08', departDate: '1521-12-21',
        via: [[7, 120], [4, 119], [1, 123]],
        glow: 340,
        title: 'The spice islands',
        text: 'Six months of uncertain sailing among the archipelagos before reaching Tidore. The sultan welcomes the trade: the holds fill with cloves.'
      },
      {
        name: 'Cape of Good Hope', place: 'South Africa',
        lat: -34.36, lon: 18.47, date: '1522-05-19',
        via: [[-9, 120], [-13, 105], [-20, 85], [-30, 60], [-35, 35], [-36, 25]],
        title: 'Rounding the cape unseen',
        text: 'The Victoria avoids every port to escape capture by the Portuguese. A wide southern course, provisions gone: more than twenty men die on the passage.'
      },
      {
        name: 'Cape Verde', place: 'Portuguese archipelago',
        lat: 14.92, lon: -23.51, date: '1522-07-09', departDate: '1522-07-15',
        via: [[-25, 5], [-10, -10], [0, -20]],
        title: 'The missing day',
        text: 'Ashore they find the ship\'s calendar is a day behind: practical proof of the day gained by sailing continuously westward. Thirteen men are detained.'
      },
      {
        name: 'Sanlúcar de Barrameda', place: 'Andalusia, Castile',
        lat: 36.78, lon: -6.35, date: '1522-09-06',
        via: [[25, -25], [33, -15], [36.0, -7.6]],
        title: 'Eighteen men',
        text: 'The Victoria returns after three years with eighteen survivors and a cargo of cloves large enough to cover the cost of the whole expedition.'
      }
    ],
    outcome: {
      achieved: [
        'First known circumnavigation of the globe, completed by Elcano and eighteen survivors',
        'Discovery of the strait between Atlantic and Pacific, today the Strait of Magellan',
        'First empirical measure of the vastness of the Pacific, and concrete proof of the one-day calendar shift'
      ],
      exchanged: [
        'To Europe: about 26 tonnes of cloves from the Moluccas',
        'In the Pacific: iron, cloth and mirrors traded for provisions; military alliances used as political currency'
      ],
      claimed: 'Castile claims the Philippines and contests Portuguese possession of the Moluccas; the dispute closes in 1529 with the sale of the Moluccan rights.',
      cost: 'Four ships out of five lost; more than 200 dead from disease, wreck, execution and armed clashes. Magellan is killed at Mactan.'
    },
    legacy:
      'The expedition makes the Earth measurable: after 1522 ocean distances stop being guesswork. ' +
      'It also opens the route that leads, decades later, to the Spanish colonisation of the Philippines and the Manila galleon.',
    humanImpact:
      'The voyage leaves behind burned villages on Guam, an armed intervention in the dynastic conflicts of Cebu, and men abandoned or detained in several ports. ' +
      'Many of the crew were enslaved or in service, and their language skills — decisive for the expedition — remain almost anonymous in the sources.',
    uncertainty:
      'Crew figures at departure vary between sources (about 240–270). Some dates of the minor stops in the Indonesian archipelago are reconstructed.',
    sources: [
      { label: 'Encyclopaedia Britannica — Ferdinand Magellan', url: 'https://www.britannica.com/biography/Ferdinand-Magellan' },
      { label: 'Encyclopaedia Britannica — Juan Sebastián del Cano', url: 'https://www.britannica.com/biography/Juan-Sebastian-del-Cano' },
      { label: 'World History Encyclopedia — Magellan\'s Circumnavigation', url: 'https://www.worldhistory.org/article/1737/magellans-circumnavigation-of-the-globe/' },
      { label: 'Royal Museums Greenwich — Navigation and the Age of Sail', url: 'https://www.rmg.co.uk/stories' }
    ]
  },

  /* ==================================================================== */
  {
    id: 'gama-1497',
    title: 'Vasco da Gama to Calicut',
    subtitle: 'The sea route between Europe and India',
    commanders: 'Vasco da Gama',
    yearsLabel: '1497 – 1499',
    accent: '#7a2f5e',
    playbackSeconds: 84,
    context:
      'Portugal has spent decades seeking direct access to the spice trade without going through the intermediaries of the Mediterranean and the Red Sea. ' +
      'Gama links the Atlantic and the Indian Ocean in a single voyage for the first time.',
    fleet: {
      ships: '4 ships',
      kinds: 'São Gabriel, São Rafael, Bérrio and a supply ship',
      crew: 'about 150–170 men',
      crewNote: 'about 55 return; the supply ship is broken up during the voyage'
    },
    sponsor: {
      name: 'Portuguese Crown — Manuel I',
      note: 'A state expedition, built on decades of reconnaissance along the African coast and on Bartolomeu Dias\'s rounding of the cape in 1488.'
    },
    goals: 'Reach the pepper and spice markets of India, open diplomatic relations, test whether the cape route was practicable.',
    waypoints: [
      {
        name: 'Lisbon', place: 'Portugal',
        lat: 38.71, lon: -9.14, date: '1497-07-08',
        title: 'Departure from the Tagus',
        text: 'Four ships leave Restelo. The São Gabriel and São Rafael were purpose-built: sturdier than caravels, designed for the open ocean and heavy cargo.'
      },
      {
        name: 'Cape Verde Islands', place: 'Portuguese archipelago',
        lat: 14.92, lon: -23.51, date: '1497-07-26', departDate: '1497-08-03',
        via: [[38.2, -9.7], [35.5, -11]],
        title: 'The last friendly port',
        text: 'Water and firewood. From here the fleet leaves the African coast and heads out into the open Atlantic: a risky and deliberate choice.'
      },
      {
        name: 'St Helena Bay', place: 'Western South Africa',
        lat: -32.75, lon: 18.05, date: '1497-11-07', departDate: '1497-11-16',
        via: [[0, -30], [-15, -32], [-28, -25], [-33, -5], [-34, 8]],
        glow: 380,
        title: 'The great Atlantic sweep',
        text: 'Ninety-three days without sighting land: an arc reaching almost to Brazil to catch the westerlies. This is the manoeuvre that makes the cape route repeatable.'
      },
      {
        name: 'Cape of Good Hope', place: 'South Africa',
        lat: -34.36, lon: 18.47, date: '1497-11-22',
        via: [[-33.6, 17.2], [-34.6, 17.8]],
        title: 'The cape rounded',
        text: 'The passage takes days of tacking against wind and current. Past the cape, the fleet enters an ocean Europe knows only by hearsay.'
      },
      {
        name: 'Mossel Bay', place: 'South Africa',
        lat: -34.18, lon: 22.14, date: '1497-11-25', departDate: '1497-12-07',
        via: [[-35.1, 19.5], [-35.0, 21.5]],
        title: 'Meeting the Khoikhoi',
        text: 'Bracelets and bells traded for cattle, then a sudden breakdown and crossbow fire. The supply ship is emptied and burned.'
      },
      {
        name: 'Island of Mozambique', place: 'East Africa',
        lat: -15.03, lon: 40.73, date: '1498-03-02', departDate: '1498-03-29',
        via: [[-34.5, 25], [-31.5, 30.5], [-27, 34.5], [-21, 38.5], [-16.5, 41.2]],
        glow: 420,
        title: 'Inside an already ancient network',
        text: 'The fleet enters a Swahili-Arab trading system centuries old, with ships bound for India and Persia. The Portuguese arrive last, and suspicious.'
      },
      {
        name: 'Mombasa', place: 'Swahili coast, Kenya',
        lat: -4.04, lon: 39.67, date: '1498-04-07', departDate: '1498-04-13',
        via: [[-11.5, 41.5], [-7.5, 40.6], [-4.6, 40.2]],
        title: 'A welcome that fails',
        text: 'Mutual suspicion and an attempted boarding at night. Gama leaves after a few days, having tortured two prisoners for information.'
      },
      {
        name: 'Malindi', place: 'Swahili coast, Kenya',
        lat: -3.22, lon: 40.12, date: '1498-04-14', departDate: '1498-04-24',
        via: [[-4.1, 40.3]],
        glow: 300,
        title: 'The Indian Ocean pilot',
        text: 'The sultan of Malindi, a rival of Mombasa, provides a pilot who knows the monsoons. The crossing to India then takes twenty-three days.'
      },
      {
        name: 'Calicut (Kozhikode)', place: 'Malabar coast, India',
        lat: 11.25, lon: 75.78, date: '1498-05-20', departDate: '1498-08-29',
        via: [[3, 52], [8, 66]],
        glow: 560,
        title: 'The pepper port',
        text: 'Calicut is an international emporium ruled by the Zamorin. The gifts Gama brings — cloth, hats, honey — are derisory for that market: negotiations stall.'
      },
      {
        name: 'Malindi', place: 'Swahili coast, Kenya',
        lat: -3.22, lon: 40.12, date: '1499-01-07', departDate: '1499-01-11',
        via: [[6, 60], [0, 50], [-2.6, 41.5]],
        title: 'Crossing against the monsoon',
        text: 'The return is attempted out of season: ninety-three days at sea, widespread scurvy, some thirty dead. The São Rafael, short of crew, is burned.'
      },
      {
        name: 'Cape of Good Hope', place: 'South Africa',
        lat: -34.36, lon: 18.47, date: '1499-03-20',
        via: [[-4.3, 40.6], [-11, 41.5], [-20, 38.5], [-27, 34.5], [-32, 30.2], [-35.3, 22]],
        title: 'Back into the Atlantic',
        text: 'The two remaining ships round the cape again. The route is now known: Portuguese fleets will sail it every year for more than a century.'
      },
      {
        name: 'Lisbon', place: 'Portugal',
        lat: 38.71, lon: -9.14, date: '1499-09-09',
        via: [[-20, 0], [-5, -15], [10, -25], [25, -30], [35, -20], [37.5, -11]],
        title: 'Homecoming',
        text: 'About 55 men return out of more than 150. The spice cargo is modest, but the route is proven: that is the result that shifts the balance of trade.'
      }
    ],
    outcome: {
      achieved: [
        'First documented sea route between Europe and India, sailed in both directions',
        'Codification of the "volta do mar": the wide Atlantic arc that uses the winds instead of hugging the coast',
        'Practical survey of the East African coast and of the monsoon regime for European navigation'
      ],
      exchanged: [
        'To Europe: pepper, cinnamon, ginger — modest quantities, but enough to prove the trade profitable',
        'To India: European goods of little value in those markets, making the trade imbalance immediately obvious'
      ],
      claimed: 'No territory occupied on this voyage; Portugal does, however, claim exclusive navigation rights in the Indian Ocean, which it will enforce by force in the years that follow.',
      cost: 'About two thirds of the men die, largely of scurvy. Two ships out of four are lost or destroyed.'
    },
    legacy:
      'The cape route moves part of the spice trade out of the Mediterranean and Mamluk circuits. ' +
      'Over the following decades Portugal builds a network of forts and garrisons — from Goa to Malacca to Hormuz — based on armed control of the straits.',
    humanImpact:
      'The trade imbalance pushes Portugal to replace exchange with coercion: bombardment of ports, compulsory passes for local shipping, naval blockades. ' +
      'On Gama\'s second voyage, in 1502, this policy includes the massacre of the passengers of a pilgrim ship. The trading networks of the Indian Ocean had existed for centuries: the European arrival militarises them.',
    uncertainty:
      'The number of men at departure varies between sources (about 148–170). The identity of the pilot engaged at Malindi is disputed: the attribution to Ahmad ibn Majid is not considered reliable.',
    sources: [
      { label: 'Encyclopaedia Britannica — Vasco da Gama', url: 'https://www.britannica.com/biography/Vasco-da-Gama' },
      { label: 'World History Encyclopedia — Vasco da Gama', url: 'https://www.worldhistory.org/Vasco_da_Gama/' },
      { label: 'UNESCO — Silk Roads: the maritime routes', url: 'https://en.unesco.org/silkroad/' },
      { label: 'Royal Museums Greenwich — stories of navigation', url: 'https://www.rmg.co.uk/stories' }
    ]
  },

  /* ==================================================================== */
  {
    id: 'zhenghe-1413',
    title: 'Zheng He, Fourth Expedition',
    subtitle: 'The Ming treasure fleet to Hormuz and Africa',
    commanders: 'Zheng He (Ma He)',
    yearsLabel: '1413 – 1415',
    accent: '#1f6b5a',
    playbackSeconds: 88,
    context:
      'The Yongle Emperor sends imperial fleets across the Indian Ocean to assert Ming prestige, collect tribute and plug into Asian trade circuits. ' +
      'The fourth expedition is the first to push as far as the Persian Gulf and the African coast.',
    fleet: {
      ships: '63 large ships',
      kinds: 'multi-masted junks with watertight bulkheads, plus smaller escort vessels',
      crew: 'over 27,000 men according to Chinese sources',
      crewNote: 'figures from the Ming annals; the size of the largest ships is debated among historians'
    },
    sponsor: {
      name: 'Ming Empire — the Yongle Emperor',
      note: 'A state expedition: imperial shipyards at Nanjing, military crews, ambassadors and interpreters aboard, including the Arabic-speaking Ma Huan.'
    },
    goals: 'Extend the Ming tributary system, escort and repatriate foreign envoys, secure the sea lanes, obtain rare goods and geographic intelligence.',
    waypoints: [
      {
        name: 'Liujiagang', place: 'Yangtze estuary, near Suzhou',
        lat: 31.45, lon: 121.10, date: '1413-10-01', departDate: '1413-11-01', approx: true,
        title: 'Departure from the imperial yards',
        text: 'The fleet gathers at the mouth of the Yangtze after being fitted out at Nanjing. Interpreters, physicians, astronomers and envoys awaiting repatriation come aboard.'
      },
      {
        name: 'Changle', place: 'Fujian, China',
        lat: 25.96, lon: 119.52, date: '1413-12-01', departDate: '1414-01-05', approx: true,
        via: [[31.0, 122.4], [28.5, 122.0]],
        title: 'Waiting for the monsoon',
        text: 'A stop in Fujian to complete the crews and wait for the north-east winter monsoon, which pushes south. Ming navigation runs on the rhythm of the seasonal winds.'
      },
      {
        name: 'Champa', place: 'Central Vietnamese coast',
        lat: 13.77, lon: 109.22, date: '1414-01-20', departDate: '1414-02-01', approx: true,
        glow: 380,
        title: 'First tributary call',
        text: 'The kingdom of Champa is already bound to the Ming by tributary ties. Formal gifts are exchanged, supplies taken on, local goods loaded.'
      },
      {
        name: 'Java', place: 'Surabaya, Indonesia',
        lat: -7.25, lon: 112.75, date: '1414-02-20', departDate: '1414-03-05', approx: true,
        via: [[6, 108], [-2, 109]],
        glow: 420,
        title: 'Java',
        text: 'One of the densest trading hubs in South-East Asia. The fleet finds Chinese communities already settled and markets linking spices, textiles and porcelain.'
      },
      {
        name: 'Palembang', place: 'Sumatra, Indonesia',
        lat: -2.99, lon: 104.76, date: '1414-03-15', departDate: '1414-03-25', approx: true,
        via: [[-5, 107]],
        title: 'Controlling the strait',
        text: 'A strategic port on the Strait of Malacca, where an earlier expedition had cleared out a raiding fleet. The garrison exists to keep the route open.'
      },
      {
        name: 'Malacca', place: 'Malay peninsula',
        lat: 2.20, lon: 102.25, date: '1414-04-05', departDate: '1414-04-20', approx: true,
        glow: 340,
        title: 'Logistics base',
        text: 'Malacca works as a forward depot: fenced warehouses, repairs, convoy reorganisation. Ming backing consolidates its rise as an emporium.'
      },
      {
        name: 'Samudera-Pasai', place: 'Northern Sumatra',
        lat: 5.18, lon: 97.14, date: '1414-05-01', departDate: '1414-05-20', approx: true,
        title: 'Intervention in a dynastic crisis',
        text: 'The fleet intervenes in the local succession conflict on behalf of the ruler recognised by the Ming. The rival claimant is captured and taken to China.'
      },
      {
        name: 'Galle', place: 'Ceylon, Sri Lanka',
        lat: 6.03, lon: 80.22, date: '1414-06-10', departDate: '1414-06-20', approx: true,
        via: [[6, 90]],
        glow: 300,
        title: 'Ceylon',
        text: 'At Galle an earlier expedition had left a trilingual stele — Chinese, Tamil and Persian — with offerings to different deities: a carefully calibrated diplomatic gesture.'
      },
      {
        name: 'Calicut (Kozhikode)', place: 'Malabar coast, India',
        lat: 11.25, lon: 75.78, date: '1414-07-01', departDate: '1414-07-20', approx: true,
        via: [[5.5, 78.5], [7.0, 76.4], [9.0, 75.2]],
        glow: 460,
        title: 'The great emporium',
        text: 'Calicut is the hinge between the western and eastern Indian Ocean. Chinese chronicles describe its weights, coinage and bargaining procedures in precise detail.'
      },
      {
        name: 'Hormuz', place: 'Persian Gulf',
        lat: 27.10, lon: 56.45, date: '1414-08-20', departDate: '1414-10-01', approx: true,
        via: [[14, 68], [20, 62], [24.5, 58.6], [26.0, 57.0]],
        glow: 420,
        title: 'As far as the Persian Gulf',
        text: 'Hormuz is the westernmost point reached by the main body of the fleet: a market for pearls, horses, gemstones and textiles from inner Asia.'
      },
      {
        name: 'Mogadishu', place: 'Somali coast',
        lat: 2.04, lon: 45.34, date: '1414-11-20', departDate: '1414-12-05', approx: true,
        via: [[26.2, 56.9], [24.6, 58.4], [21.5, 60.2], [15.5, 55], [11, 51], [5.5, 47.5]],
        glow: 380,
        title: 'A detachment towards Africa',
        text: 'Separate squadrons reach the African coast. The exact chronology of these branches is uncertain: the Ming sources record outcomes rather than itineraries.'
      },
      {
        name: 'Malindi', place: 'Swahili coast, Kenya',
        lat: -3.22, lon: 40.12, date: '1414-12-15', departDate: '1415-01-10', approx: true,
        glow: 320,
        title: 'Envoys and animals',
        text: 'Envoys set out from the Swahili cities for China. Animals for the court travel with them: a giraffe will reach Beijing and be read as an auspicious omen.'
      },
      {
        name: 'Liujiagang', place: 'Return to China',
        lat: 31.45, lon: 121.10, date: '1415-08-12', approx: true,
        via: [[0, 55], [5, 70], [6, 85], [7, 95], [2.5, 100.8], [8, 110], [18, 113],
          [23.0, 117.6], [27.5, 121.6]],
        title: 'Back to the Ming court',
        text: 'The fleet returns in the summer of 1415 with envoys from many kingdoms. After 1433 the great expeditions are halted, by political choice and on grounds of cost.'
      }
    ],
    outcome: {
      achieved: [
        'Extension of Ming naval presence to the Persian Gulf and the East African coast',
        'Embassies from many Indian Ocean kingdoms brought back to China',
        'Detailed geographic and commercial accounts, recorded by eyewitnesses aboard such as Ma Huan and Fei Xin'
      ],
      exchanged: [
        'To China: pepper, incense, ivory, gemstones, exotic animals, envoys and formal tribute',
        'To the ports visited: silk, porcelain, copper coin and Ming diplomatic recognition'
      ],
      claimed: 'No territorial colonisation: the aim is tributary recognition, not settlement. Military force is nonetheless used at Palembang, in Ceylon and in Sumatra.',
      cost: 'Enormous cost to the imperial treasury: it will be among the arguments of the officials who eventually have the voyages stopped.'
    },
    legacy:
      'The treasure fleets show a model of maritime projection different from the European one: prestige, tributary diplomacy and regulated trade, without founding colonies. ' +
      'Their halt after 1433 is an internal political decision, not a technical limit.',
    humanImpact:
      'The fleet\'s presence redraws local balances: it backs some rulers against others, seizes and deports political rivals, imposes security on the sea lanes by force. ' +
      'Malacca benefits and grows as an emporium; other ports face armed intervention. The monumental figures given in the Ming chronicles are debated among historians.',
    uncertainty:
      'Dates and itineraries of the African detachments are only approximately reconstructed. The dimensions of the "treasure ships" given in the sources are widely debated.',
    sources: [
      { label: 'Encyclopaedia Britannica — Zheng He', url: 'https://www.britannica.com/biography/Zheng-He' },
      { label: 'World History Encyclopedia — Zheng He', url: 'https://www.worldhistory.org/Zheng_He/' },
      { label: 'UNESCO — Silk Roads: the maritime routes', url: 'https://en.unesco.org/silkroad/' },
      { label: 'National Museum of Asian Art (Smithsonian)', url: 'https://asia.si.edu/' }
    ]
  },

  /* ==================================================================== */
  {
    id: 'cook-1768',
    title: 'James Cook, First Voyage',
    subtitle: 'The transit of Venus and the Pacific coasts',
    commanders: 'James Cook — HM Bark Endeavour',
    yearsLabel: '1768 – 1771',
    accent: '#4a3f8c',
    playbackSeconds: 92,
    context:
      'The Royal Society obtains a ship from the Admiralty to observe the 1769 transit of Venus from Tahiti, a key measurement for estimating the Earth-Sun distance. ' +
      'Secret instructions add a second objective: to search for the southern continent.',
    fleet: {
      ships: '1 ship',
      kinds: 'HM Bark Endeavour, a former Whitby collier',
      crew: 'about 94 people at departure',
      crewNote: 'including the naturalist Joseph Banks and his scientific party; more than a third die during the voyage'
    },
    sponsor: {
      name: 'British Admiralty and the Royal Society',
      note: 'Public Crown funding under George III; the scientific side is partly paid for by Joseph Banks.'
    },
    goals: 'Observe the transit of Venus, gather natural history data, survey coastlines and test the existence of Terra Australis.',
    waypoints: [
      {
        name: 'Plymouth', place: 'England',
        lat: 50.37, lon: -4.14, date: '1768-08-26',
        title: 'Departure from Plymouth',
        text: 'A converted collier: flat-bottomed, sturdy, able to run aground without breaking up. It proves the decisive technical choice of the voyage.'
      },
      {
        name: 'Madeira', place: 'Portugal',
        lat: 32.65, lon: -16.91, date: '1768-09-13', departDate: '1768-09-19',
        title: 'Wine and onions',
        text: 'Wine, water and fresh provisions taken on. Cook enforces a strict diet of sauerkraut and citrus: his handling of scurvy proves remarkably effective.'
      },
      {
        name: 'Rio de Janeiro', place: 'Brazil',
        lat: -22.91, lon: -43.17, date: '1768-11-13', departDate: '1768-12-07',
        via: [[15, -25], [2, -28], [-10, -33], [-16, -36.0], [-20, -38.6], [-23.3, -42.2]],
        title: 'Suspicion at Rio',
        text: 'The Portuguese viceroy does not believe in a scientific expedition and restricts landings. Banks collects specimens in secret, lowering himself from the ship.'
      },
      {
        name: 'Tierra del Fuego', place: 'Cape Horn',
        lat: -55.60, lon: -67.20, date: '1769-01-16', departDate: '1769-01-22',
        via: [[-35, -50], [-45, -58]],
        title: 'Rounding Cape Horn',
        text: 'During a botanical excursion ashore two members of Banks\'s party, both enslaved Africans, freeze to death in a snowstorm.'
      },
      {
        name: 'Matavai Bay', place: 'Tahiti',
        lat: -17.50, lon: -149.45, date: '1769-04-13', departDate: '1769-06-02',
        via: [[-58, -85], [-45, -115], [-30, -135], [-20, -145]],
        glow: 320,
        title: 'Three months at Tahiti',
        text: 'The crew builds an observatory and lives alongside Tahitian society. Thefts, punishments and cultural misunderstandings mark the relationship as much as peaceful exchange.'
      },
      {
        name: 'Point Venus', place: 'Tahiti',
        lat: -17.49, lon: -149.48, date: '1769-06-03', departDate: '1769-07-13',
        title: 'The transit of Venus',
        text: 'On 3 June Venus crosses the solar disc. The measurements prove less precise than hoped because of an optical effect at the planet\'s edge, but they feed into the international calculation.'
      },
      {
        name: 'Tūranganui-a-Kiwa', place: 'Aotearoa / New Zealand',
        lat: -38.68, lon: 178.02, date: '1769-10-08', departDate: '1769-10-11',
        via: [[-22, -160], [-28, -175], [-34, 179], [-37, 179.6]],
        glow: 340,
        title: 'First encounter with Māori',
        text: 'First contact goes wrong: several Māori are killed in the days of the landing. Cook names the place Poverty Bay. In 2019 the New Zealand government issues an official statement of regret.'
      },
      {
        name: 'Totaranui / Queen Charlotte Sound', place: 'Aotearoa / New Zealand',
        lat: -41.09, lon: 174.29, date: '1770-01-15', departDate: '1770-02-06',
        via: [[-37.4, 178.9], [-34.9, 175.8], [-33.9, 172.4], [-37.6, 172.9], [-40.3, 172.2], [-41.3, 173.6]],
        glow: 420,
        title: 'Surveying the two islands',
        text: 'Six months of circumnavigation produce a remarkably accurate chart. The Tahitian navigator Tupaia, who joined at Tahiti, makes dialogue with Māori possible.'
      },
      {
        name: 'Kamay / Botany Bay', place: 'Eastern Australia',
        lat: -34.00, lon: 151.20, date: '1770-04-29', departDate: '1770-05-06',
        via: [[-40.5, 172.0], [-41, 168], [-38.5, 152], [-35.2, 151.6]],
        glow: 300,
        title: 'Kamay',
        text: 'The landing takes place against the opposition of two Gweagal men, driven off with musket fire. The bay is named Botany Bay for the wealth of plants collected.'
      },
      {
        name: 'Endeavour River', place: 'Queensland, Australia',
        lat: -15.44, lon: 145.25, date: '1770-06-17', departDate: '1770-08-04',
        via: [[-30, 153.5], [-24, 153.5], [-19, 147]],
        glow: 380,
        title: 'Aground on the reef',
        text: 'The ship holes her hull on a coral bank and is repaired for seven weeks on a beach. Here the Guugu Yimithirr name the animal that will become "kangaroo".'
      },
      {
        name: 'Bedanug / Possession Island', place: 'Torres Strait',
        lat: -10.72, lon: 142.40, date: '1770-08-22', departDate: '1770-08-23',
        via: [[-13, 143.8]],
        title: 'The claim',
        text: 'Cook declares the entire east coast a British possession, though he has seen that it is inhabited. The declaration will underpin the British claims of 1788.'
      },
      {
        name: 'Batavia', place: 'Jakarta, Dutch East Indies',
        lat: -6.18, lon: 106.83, date: '1770-10-10', departDate: '1770-12-26',
        via: [[-9.5, 132], [-7.0, 122], [-5.8, 113], [-5.6, 108]],
        title: 'The deadliest stop',
        text: 'In the Batavia yards the ship is put back in order, but malaria and dysentery strike the crew: around thirty men die here or shortly after, Tupaia among them.'
      },
      {
        name: 'Cape Town', place: 'Dutch Cape Colony',
        lat: -33.92, lon: 18.42, date: '1771-03-14', departDate: '1771-04-15',
        via: [[-6.0, 105.6], [-9, 102], [-15, 95], [-25, 75], [-32, 50], [-36.0, 27], [-36.0, 20.5]],
        title: 'Recruiting for the way home',
        text: 'The Indian Ocean crossing worsens the illnesses contracted at Batavia. At the Cape fresh sailors are signed on to have crew enough for the return.'
      },
      {
        name: 'The Downs', place: 'England',
        lat: 51.20, lon: 1.45, date: '1771-07-12',
        via: [[-25, -5], [-5, -18], [15, -27], [32, -22], [45, -10], [49.3, -6.5], [50.0, -2.0]],
        title: 'Homecoming',
        text: 'Three years of voyaging, thousands of botanical specimens, charts of a new order of quality. Fewer than two thirds of those who set out come home.'
      }
    ],
    outcome: {
      achieved: [
        'Observation of the 1769 transit of Venus from Tahiti, feeding into the international calculation of the Earth-Sun distance',
        'First complete chart of the New Zealand coasts and first European survey of the east coast of Australia',
        'Around 30,000 botanical specimens collected by Banks and Solander, many never before described by European science',
        'Demonstration that strict management of diet and hygiene sharply reduces scurvy'
      ],
      exchanged: [
        'Polynesian navigational knowledge: Tupaia supplies information on dozens of Pacific islands and makes communication possible in Aotearoa',
        'Iron, cloth and nails traded for provisions, with rapid effects on local economies'
      ],
      claimed: 'The east coast of Australia is declared a British possession at Possession Island, with no negotiation and no consent from the peoples living there.',
      cost: 'About 38 dead out of an initial complement of 94, largely from illness contracted at Batavia. Several Māori killed in the first clashes in New Zealand.'
    },
    legacy:
      'The voyage sets a template for the modern scientific expedition: chronometry, systematic coastal survey, documented natural history collecting. ' +
      'The same charts, however, become the instrument of British colonisation in the Pacific.',
    humanImpact:
      'The claim of 1770 opens the way to the penal settlement of 1788 and to the dispossession of Aboriginal Australian peoples, with consequences that continue today. ' +
      'In Aotearoa the first encounters cost Māori lives and remain a publicly acknowledged wound. Tupaia\'s navigational knowledge, essential to the expedition, was long left in the background of European accounts.',
    uncertainty:
      'The exact number of people aboard varies slightly between registers. Port dates are those of the ship\'s logs.',
    sources: [
      { label: 'Royal Museums Greenwich — Captain Cook\'s voyages', url: 'https://www.rmg.co.uk/stories' },
      { label: 'National Library of Australia — Cook\'s Endeavour journal', url: 'https://www.nla.gov.au/collections/significant-collections/cook-collection' },
      { label: 'Encyclopaedia Britannica — James Cook', url: 'https://www.britannica.com/biography/James-Cook' },
      { label: 'Te Papa Tongarewa — Tupaia and the first encounters', url: 'https://www.tepapa.govt.nz/discover-collections' }
    ]
  },

  /* ==================================================================== */
  {
    id: 'beagle-1831',
    title: 'HMS Beagle and Charles Darwin',
    subtitle: 'Five years of surveys, fossils and islands',
    commanders: 'Robert FitzRoy — with Charles Darwin as naturalist',
    yearsLabel: '1831 – 1836',
    accent: '#3f6b2f',
    playbackSeconds: 100,
    context:
      'The Royal Navy sends the Beagle to complete the hydrographic survey of South America and to measure a chain of longitudes around the globe. ' +
      'FitzRoy is looking for a naturalist to take aboard as a dining companion: it will be Charles Darwin, aged 22.',
    fleet: {
      ships: '1 ship',
      kinds: 'HMS Beagle, a Cherokee-class brig re-rigged as a three-masted barque',
      crew: 'about 74 people',
      crewNote: 'including officers, sailors, an artist, an instrument-maker and 22 marine chronometers'
    },
    sponsor: {
      name: 'British Admiralty — Hydrographic Office',
      note: 'A public survey expedition; FitzRoy pays out of his own pocket for part of the instruments and for the ship\'s artist.'
    },
    goals: 'Survey the coasts of Patagonia and Tierra del Fuego, measure longitudes with a chronometric chain around the world, gather natural history and geological observations.',
    waypoints: [
      {
        name: 'Plymouth', place: 'England',
        lat: 50.37, lon: -4.14, date: '1831-12-27',
        title: 'Departure after two false starts',
        text: 'The Beagle sails on the third attempt, after two departures driven back by weather. Darwin will be seasick for almost the whole five years.'
      },
      {
        name: 'Praia', place: 'Cape Verde',
        lat: 14.92, lon: -23.51, date: '1832-01-16', departDate: '1832-02-08',
        title: 'A white band in the rock',
        text: 'On Santiago Darwin notices a band of fossil shells set into a volcanic cliff: proof that the ground has risen. It is the observation that turns him towards geology.'
      },
      {
        name: 'Salvador de Bahia', place: 'Brazil',
        lat: -12.97, lon: -38.51, date: '1832-02-28', departDate: '1832-03-18',
        via: [[8, -27], [0, -31], [-6, -33], [-10, -35.5]],
        title: 'Forest and slavery',
        text: 'The Atlantic forest delights him; the Brazilian slave system appals him. The row with FitzRoy over it is fierce enough that he nearly leaves the ship.'
      },
      {
        name: 'Rio de Janeiro', place: 'Brazil',
        lat: -22.91, lon: -43.17, date: '1832-04-04', departDate: '1832-07-05',
        via: [[-14, -38.0], [-18, -37.2], [-21, -39.6], [-23.3, -42.2]],
        title: 'Three months ashore',
        text: 'While the Beagle surveys the coast, Darwin stays ashore collecting insects, spiders and plants. The stream of crates shipped home to his mentor Henslow begins.'
      },
      {
        name: 'Montevideo', place: 'Uruguay',
        lat: -34.90, lon: -56.19, date: '1832-07-26', departDate: '1832-12-01',
        via: [[-24, -43.5], [-27.5, -47], [-31, -50.5]],
        title: 'Base for Patagonia',
        text: 'Montevideo becomes the base for surveys in the Río de la Plata. At Punta Alta Darwin digs up bones of large extinct mammals, similar to but not identical with living species.'
      },
      {
        name: 'Tierra del Fuego', place: 'Beagle Channel',
        lat: -54.87, lon: -68.31, date: '1832-12-17', departDate: '1833-02-26',
        via: [[-38, -56.3], [-42, -60], [-46, -64], [-51, -66.5], [-55.5, -66.0]],
        glow: 380,
        title: 'The Yámana return',
        text: 'FitzRoy brings home three Yámana taken to England on the previous voyage, meaning to establish a mission. The plan collapses within days.'
      },
      {
        name: 'Falkland Islands / Malvinas', place: 'South Atlantic',
        lat: -51.70, lon: -57.85, date: '1833-03-01', departDate: '1833-04-06',
        via: [[-55.5, -66.0], [-53, -61]],
        title: 'Contested islands',
        text: 'The islands were occupied by the British a few months earlier. Darwin studies geology and fossils in an almost treeless, wind-scoured archipelago.'
      },
      {
        name: 'Valparaíso', place: 'Chile',
        lat: -33.05, lon: -71.62, date: '1834-07-23', departDate: '1834-11-10',
        via: [[-53, -61], [-56.5, -67.5], [-57, -72], [-50, -77], [-40, -75]],
        glow: 400,
        title: 'Into the Andes',
        text: 'Darwin crosses the cordillera and finds fossil shells above 3,000 metres, along with petrified tree stumps. The mountains, he realises, are still rising.'
      },
      {
        name: 'Concepción', place: 'Chile',
        lat: -36.83, lon: -73.05, date: '1835-03-04', departDate: '1835-03-07',
        title: 'The 1835 earthquake',
        text: 'They arrive days after the quake: the town flattened, the coast visibly lifted. Darwin watches at first hand the process he had inferred from the rocks.'
      },
      {
        name: 'Callao', place: 'Peru',
        lat: -12.06, lon: -77.15, date: '1835-07-19', departDate: '1835-09-07',
        via: [[-33, -73.5], [-27, -72.5], [-20, -72], [-14, -77.8]],
        title: 'A stop at Lima',
        text: 'Peru is in political turmoil and movement ashore is restricted. The Beagle completes its longitude measurements before the westward crossing.'
      },
      {
        name: 'Galápagos', place: 'Ecuador',
        lat: -0.62, lon: -90.35, date: '1835-09-15', departDate: '1835-10-20',
        via: [[-6, -83]],
        glow: 340,
        title: 'Five weeks in the Galápagos',
        text: 'Darwin collects tortoises, iguanas and birds without systematically noting which island each came from. It is the ornithologist John Gould, in London, who reveals the finches are distinct species.'
      },
      {
        name: 'Tahiti', place: 'Polynesia',
        lat: -17.53, lon: -149.57, date: '1835-11-15', departDate: '1835-11-26',
        via: [[-8, -110], [-14, -130]],
        title: 'Across the Pacific',
        text: 'Three weeks at sea. Darwin studies the reef ringing the island and begins to formulate his explanation of how atolls form.'
      },
      {
        name: 'Bay of Islands', place: 'Aotearoa / New Zealand',
        lat: -35.27, lon: 174.08, date: '1835-12-21', departDate: '1835-12-30',
        via: [[-22, -170], [-28, 178]],
        title: 'A short call',
        text: 'Darwin finds the mission colony unwelcoming and leaves dissatisfied. His notes here are among the most cursory of the voyage.'
      },
      {
        name: 'Sydney', place: 'New South Wales',
        lat: -33.86, lon: 151.21, date: '1836-01-12', departDate: '1836-01-30',
        via: [[-34, 166], [-34, 158]],
        glow: 320,
        title: 'A colony on the rise',
        text: 'Struck by how fast the colony is growing, Darwin also records Australian wildlife and the conditions imposed on Aboriginal peoples by the spread of settlement.'
      },
      {
        name: 'Hobart', place: 'Tasmania',
        lat: -42.88, lon: 147.33, date: '1836-02-05', departDate: '1836-02-17',
        via: [[-35.2, 151.8], [-40, 149.5], [-43.6, 148.4]],
        title: 'Tasmania',
        text: 'Geological surveys around the Derwent. A few years earlier the Aboriginal Tasmanian population was forcibly deported to the islands of the Bass Strait.'
      },
      {
        name: 'Cocos (Keeling) Islands', place: 'Indian Ocean',
        lat: -12.17, lon: 96.83, date: '1836-04-01', departDate: '1836-04-12',
        via: [[-43.9, 146.0], [-40, 142], [-38, 130], [-36, 118], [-30, 110], [-20, 101]],
        glow: 260,
        title: 'The atoll theory',
        text: 'Soundings along the reef confirm the hypothesis: the atoll forms as the volcanic island subsides and the coral keeps growing upward. It will be his first scientific book.'
      },
      {
        name: 'Cape Town', place: 'Cape Colony',
        lat: -33.92, lon: 18.42, date: '1836-05-31', departDate: '1836-06-18',
        via: [[-20, 80], [-28, 55], [-34, 35], [-36.0, 26], [-36.0, 20.5]],
        title: 'Meeting Herschel',
        text: 'Darwin and FitzRoy meet the astronomer John Herschel, then turning over the "mystery of mysteries": the origin of new species from others.'
      },
      {
        name: 'St Helena', place: 'South Atlantic',
        lat: -15.96, lon: -5.72, date: '1836-07-08', departDate: '1836-07-14',
        via: [[-30, 10], [-22, 0]],
        title: 'An island transformed',
        text: 'Five days of geological excursions on an island where introduced species have already replaced most of the original vegetation.'
      },
      {
        name: 'Salvador de Bahia', place: 'Brazil',
        lat: -12.97, lon: -38.51, date: '1836-08-01', departDate: '1836-08-06',
        via: [[-8, -14], [-9, -25]],
        title: 'Closing the chain',
        text: 'FitzRoy recrosses the Atlantic to re-measure Bahia and check the chain of longitudes: the accuracy of the survey is worth a detour of weeks.'
      },
      {
        name: 'Falmouth', place: 'Cornwall, England',
        lat: 50.15, lon: -5.07, date: '1836-10-02',
        via: [[-10, -35], [-5, -32], [2, -30], [15, -33], [30, -30], [42, -19], [48, -9]],
        title: 'Homecoming',
        text: 'Almost five years on, the Beagle returns. Darwin is already a recognised scientist on the strength of his crates of fossils. The theory will come much later.'
      }
    ],
    outcome: {
      achieved: [
        'Detailed hydrographic survey of the southern coasts of South America, used by the navy for decades',
        'A chain of longitude measurements around the globe using 22 chronometers, among the most accurate of the age',
        'Thousands of geological, fossil and zoological specimens shipped to England during the voyage',
        'The theory that coral atolls form by subsidence, confirmed by twentieth-century drilling'
      ],
      exchanged: [
        'Observations and specimens to British scientific institutions',
        'No commercial objective: the voyage is funded as a naval and scientific survey'
      ],
      claimed: 'No new territorial claims; the voyage does, however, consolidate the navigational knowledge that serves British maritime and commercial expansion.',
      cost: 'Several crew members die of illness or drowning during the surveys. The attempted mission in Tierra del Fuego fails and leaves the Yámana worse off than before.'
    },
    legacy:
      'The notebooks give Darwin the material he will work on for twenty years, up to "On the Origin of Species" in 1859. ' +
      'FitzRoy\'s charts stay in use for generations: the expedition is at once a hydrographic success and the premise of a biological revolution.',
    humanImpact:
      'The repatriation of the Yámana shows the limits of the nineteenth-century missionary project: three people uprooted, returned home and left between two worlds. ' +
      'Darwin documents slavery in Brazil and the violence of Rosas\'s campaign against the indigenous peoples of the pampas in harsh terms. ' +
      'His observations sit, however, alongside the cultural hierarchies of his time, which mark the language of his notebooks.',
    uncertainty:
      'Some minor port dates come from personal diaries and may differ by a few days from the ship\'s official registers.',
    sources: [
      { label: 'Darwin Online — Beagle diary and notebooks', url: 'http://darwin-online.org.uk/' },
      { label: 'Darwin Correspondence Project (Cambridge)', url: 'https://www.darwinproject.ac.uk/' },
      { label: 'Encyclopaedia Britannica — Charles Darwin', url: 'https://www.britannica.com/biography/Charles-Darwin' },
      { label: 'Royal Museums Greenwich — hydrography and the Royal Navy', url: 'https://www.rmg.co.uk/stories' }
    ]
  }
];

export const METHOD = {
  title: 'Method and sources',
  paragraphs: [
    'The routes drawn on this map are <strong>teaching approximations</strong>. The stops correspond to places documented in ships\' logs and chronicles; the stretches between one stop and the next are curves drawn to stay at sea and keep the track readable, not reconstructions of the actual day-by-day sailing.',
    'The coastlines are an original, deliberately simplified drawing, not a nautical chart. No historical map or third-party asset has been used.',
    'Dates are those given in the sources of the time. For expeditions before 1582 the calendar in use was the Julian one: these dates should not be compared directly with today\'s calendar.',
    'Where the historiography is uncertain — the identity of an island, the exact size of a crew, the chronology of a detachment — the figure is marked as estimated or approximate, or left out.',
    'The historical context includes the consequences, not only the exploration: trade and coercion, scientific exchange and violence, knowledge and dispossession sit together in the same voyages. The texts avoid a celebratory register and do not present conquest as an achievement.'
  ]
};
