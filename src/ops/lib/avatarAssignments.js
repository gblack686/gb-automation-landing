const AVATAR_GROUPS = {
  angel: [
    '/tac/avatars/angel/01-lgn-1-akroma-angel-of-wrath.jpg',
    '/tac/avatars/angel/02-8ed-2-angelic-page.jpg',
    '/tac/avatars/angel/03-10e-2-angel-of-mercy.jpg',
    '/tac/avatars/angel/04-9ed-7-blinding-angel.jpg',
    '/tac/avatars/angel/05-ons-28-exalted-angel.jpg',
    '/tac/avatars/angel/06-8ed-133-fallen-angel.jpg',
    '/tac/avatars/angel/07-ody-288-iridescent-angel.jpg',
    '/tac/avatars/angel/08-mrd-15-luminous-angel.jpg',
    '/tac/avatars/angel/09-10e-339-platinum-angel.jpg',
    '/tac/avatars/angel/10-dst-9-pristine-angel.jpg',
    '/tac/avatars/angel/11-10e-35-reya-dawnbringer.jpg',
    '/tac/avatars/angel/12-7ed-41-serra-advocate.jpg',
  ],
  cleric: [
    '/tac/avatars/cleric/01-leonin-elder.jpg',
    '/tac/avatars/cleric/02-master-healer.jpg',
    '/tac/avatars/cleric/03-exiled-doomsayer.jpg',
    '/tac/avatars/cleric/04-defender-of-the-order.jpg',
    '/tac/avatars/cleric/05-boneknitter.jpg',
    '/tac/avatars/cleric/06-beloved-chaplain.jpg',
    '/tac/avatars/cleric/07-storm-shaman.jpg',
    '/tac/avatars/cleric/08-ancestor-s-chosen.jpg',
  ],
  dragon: [
    '/tac/avatars/dragon/01-scg-136-bladewing-the-risen.jpg',
    '/tac/avatars/dragon/02-mrd-155-clockwork-dragon.jpg',
    '/tac/avatars/dragon/03-7ed-178-crimson-hellkite.jpg',
    '/tac/avatars/dragon/04-scg-87-dragon-mage.jpg',
    '/tac/avatars/dragon/05-scg-88-dragon-tyrant.jpg',
    '/tac/avatars/dragon/06-scg-12-eternal-dragon.jpg',
    '/tac/avatars/dragon/07-dst-62-furnace-dragon.jpg',
    '/tac/avatars/dragon/08-10e-205-furnace-whelp.jpg',
    '/tac/avatars/dragon/09-lgn-103-imperial-hellkite.jpg',
    '/tac/avatars/dragon/10-chk-217-jugan-the-rising-star.jpg',
    '/tac/avatars/dragon/11-chk-72-keiga-the-tide-star.jpg',
    '/tac/avatars/dragon/12-lgn-104-kilnmouth-dragon.jpg',
  ],
  elf: [
    '/tac/avatars/elf/01-elvish-bard.jpg',
    '/tac/avatars/elf/02-elvish-house-party.jpg',
    '/tac/avatars/elf/03-viridian-scout.jpg',
    '/tac/avatars/elf/04-tel-jilad-outrider.jpg',
    '/tac/avatars/elf/05-glissa-sunseeker.jpg',
    '/tac/avatars/elf/06-elvish-champion.jpg',
    '/tac/avatars/elf/07-ambush-commander.jpg',
    '/tac/avatars/elf/08-caller-of-the-claw.jpg',
    '/tac/avatars/elf/09-birchlore-rangers.jpg',
    '/tac/avatars/elf/10-elder-druid.jpg',
    '/tac/avatars/elf/11-aberrant-mind-sorcerer.jpg',
    '/tac/avatars/elf/12-abomination-of-llanowar.jpg',
  ],
  'fifth-dawn-artifact-creature': [
    '/tac/avatars/fifth-dawn-artifact-creature/01-anodet-lurker.jpg',
    '/tac/avatars/fifth-dawn-artifact-creature/02-arachnoid.jpg',
    '/tac/avatars/fifth-dawn-artifact-creature/03-arcbound-wanderer.jpg',
    '/tac/avatars/fifth-dawn-artifact-creature/04-battered-golem.jpg',
    '/tac/avatars/fifth-dawn-artifact-creature/05-composite-golem.jpg',
    '/tac/avatars/fifth-dawn-artifact-creature/06-etched-oracle.jpg',
    '/tac/avatars/fifth-dawn-artifact-creature/07-ferropede.jpg',
    '/tac/avatars/fifth-dawn-artifact-creature/08-lunar-avenger.jpg',
  ],
  'fifth-dawn-human': [
    '/tac/avatars/fifth-dawn-human/01-auriok-champion.jpg',
    '/tac/avatars/fifth-dawn-human/02-auriok-salvagers.jpg',
    '/tac/avatars/fifth-dawn-human/03-auriok-windwalker.jpg',
    '/tac/avatars/fifth-dawn-human/04-eternal-witness.jpg',
    '/tac/avatars/fifth-dawn-human/05-fleshgrafter.jpg',
    '/tac/avatars/fifth-dawn-human/06-moriok-rigger.jpg',
    '/tac/avatars/fifth-dawn-human/07-sylvok-explorer.jpg',
    '/tac/avatars/fifth-dawn-human/08-thought-courier.jpg',
  ],
  goblin: [
    '/tac/avatars/goblin/01-festering-goblin.jpg',
    '/tac/avatars/goblin/02-goblin-balloon-brigade.jpg',
    '/tac/avatars/goblin/03-akki-drillmaster.jpg',
    '/tac/avatars/goblin/04-goblin-mime.jpg',
    '/tac/avatars/goblin/05-goblin-brawler.jpg',
    '/tac/avatars/goblin/06-crazed-goblin.jpg',
    '/tac/avatars/goblin/07-spikeshot-goblin.jpg',
    '/tac/avatars/goblin/08-goblin-chariot.jpg',
    '/tac/avatars/goblin/09-rock-jockey.jpg',
    '/tac/avatars/goblin/10-goblin-grappler.jpg',
    '/tac/avatars/goblin/11-adder-staff-boggart.jpg',
    '/tac/avatars/goblin/12-afterburner-expert.jpg',
  ],
  moonfolk: [
    '/tac/avatars/moonfolk/01-erayo-soratami-ascendant-erayos-essence.jpg',
    '/tac/avatars/moonfolk/02-floodbringer.jpg',
    '/tac/avatars/moonfolk/03-meloku-the-clouded-mirror.jpg',
    '/tac/avatars/moonfolk/04-moonbow-illusionist.jpg',
    '/tac/avatars/moonfolk/05-oboro-breezecaller.jpg',
    '/tac/avatars/moonfolk/06-oboro-envoy.jpg',
    '/tac/avatars/moonfolk/07-soratami-cloudskater.jpg',
    '/tac/avatars/moonfolk/08-soratami-mindsweeper.jpg',
  ],
  myr: [
    '/tac/avatars/myr/01-myr-quadropod.jpg',
    '/tac/avatars/myr/02-coretapper.jpg',
    '/tac/avatars/myr/03-alpha-myr.jpg',
    '/tac/avatars/myr/04-myr-servitor.jpg',
    '/tac/avatars/myr/05-myr-landshaper.jpg',
    '/tac/avatars/myr/06-copper-myr.jpg',
    '/tac/avatars/myr/07-suntouched-myr.jpg',
    '/tac/avatars/myr/08-myr-moonvessel.jpg',
  ],
  ninja: [
    '/tac/avatars/ninja/01-higure-the-still-wind.jpg',
    '/tac/avatars/ninja/02-ink-eyes-servant-of-oni.jpg',
    '/tac/avatars/ninja/03-mistblade-shinobi.jpg',
    '/tac/avatars/ninja/04-ninja-of-the-deep-hours.jpg',
    '/tac/avatars/ninja/05-okiba-gang-shinobi.jpg',
    '/tac/avatars/ninja/06-skullsnatcher.jpg',
    '/tac/avatars/ninja/07-throat-slitter.jpg',
    '/tac/avatars/ninja/08-walker-of-secret-ways.jpg',
  ],
  samurai: [
    '/tac/avatars/samurai/01-araba-mothrider.jpg',
    '/tac/avatars/samurai/02-battle-mad-ronin.jpg',
    '/tac/avatars/samurai/03-brothers-yamazaki.jpg',
    '/tac/avatars/samurai/04-bushi-tenderfoot-kenzo-the-hardhearted.jpg',
    '/tac/avatars/samurai/05-cursed-ronin.jpg',
    '/tac/avatars/samurai/06-devoted-retainer.jpg',
    '/tac/avatars/samurai/07-fumiko-the-lowblood.jpg',
    '/tac/avatars/samurai/08-hand-of-cruelty.jpg',
    '/tac/avatars/samurai/09-hand-of-honor.jpg',
    '/tac/avatars/samurai/10-iizuka-the-ruthless.jpg',
  ],
  spirit: [
    '/tac/avatars/spirit/01-eternal-dragon.jpg',
    '/tac/avatars/spirit/02-lavaborn-muse.jpg',
    '/tac/avatars/spirit/03-angelic-page.jpg',
    '/tac/avatars/spirit/04-graveborn-muse.jpg',
    '/tac/avatars/spirit/05-will-o-the-wisp.jpg',
    '/tac/avatars/spirit/06-ghost-lit-redeemer.jpg',
    '/tac/avatars/spirit/07-pteron-ghost.jpg',
    '/tac/avatars/spirit/08-vampiric-spirit.jpg',
    '/tac/avatars/spirit/09-seedborn-muse.jpg',
    '/tac/avatars/spirit/10-bellowing-fiend.jpg',
    '/tac/avatars/spirit/11-adamaro-first-to-desire.jpg',
    '/tac/avatars/spirit/12-akuta-born-of-ash.jpg',
  ],
  'tac-team': [
    '/tac/avatars/tac-team/tac-architect.png',
    '/tac/avatars/tac-team/tac-artifact-generator.png',
    '/tac/avatars/tac-team/tac-builder.png',
    '/tac/avatars/tac-team/tac-director.png',
    '/tac/avatars/tac-team/tac-lead.png',
    '/tac/avatars/tac-team/tac-ops.png',
    '/tac/avatars/tac-team/tac-researcher.png',
    '/tac/avatars/tac-team/tac-self-improve.png',
    '/tac/avatars/tac-team/tac-validator.png',
  ],
  wizard: [
    '/tac/avatars/wizard/01-artful-looter.jpg',
    '/tac/avatars/wizard/02-etched-oracle.jpg',
    '/tac/avatars/wizard/03-memnarch.jpg',
    '/tac/avatars/wizard/04-wizard-replica.jpg',
    '/tac/avatars/wizard/05-temporal-adept.jpg',
    '/tac/avatars/wizard/06-aphetto-runecaster.jpg',
    '/tac/avatars/wizard/07-skirk-alarmist.jpg',
    '/tac/avatars/wizard/08-nameless-one.jpg',
    '/tac/avatars/wizard/09-scrivener.jpg',
    '/tac/avatars/wizard/10-telepathic-spies.jpg',
  ],
};

const TAC_ROLE_AVATARS = [
  ['director', '/tac/avatars/tac-team/tac-director.png'],
  ['lead', '/tac/avatars/tac-team/tac-lead.png'],
  ['researcher', '/tac/avatars/tac-team/tac-researcher.png'],
  ['architect', '/tac/avatars/tac-team/tac-architect.png'],
  ['builder', '/tac/avatars/tac-team/tac-builder.png'],
  ['validator', '/tac/avatars/tac-team/tac-validator.png'],
  ['ops', '/tac/avatars/tac-team/tac-ops.png'],
  ['self-improve', '/tac/avatars/tac-team/tac-self-improve.png'],
  ['artifact', '/tac/avatars/tac-team/tac-artifact-generator.png'],
];

const KIND_GROUPS = {
  agent: ['tac-team', 'samurai', 'ninja', 'cleric', 'fifth-dawn-human'],
  skill: ['elf', 'wizard', 'goblin', 'myr', 'spirit', 'fifth-dawn-artifact-creature'],
  command: ['goblin', 'myr', 'samurai', 'ninja'],
  expert: ['dragon', 'angel', 'wizard', 'cleric'],
  prompt: ['moonfolk', 'spirit', 'wizard', 'angel'],
};

const KEYWORD_GROUPS = [
  { group: 'tac-team', terms: ['tac-', 'tac ', 'tactical agentic coding'] },
  { group: 'ninja', terms: ['security', 'anti-bot', 'stealth', 'scrape', 'browser', 'playwright'] },
  { group: 'myr', terms: ['infra', 'aws', 'gcp', 'disk', 'storage', 'ops', 'deploy', 'amplify'] },
  { group: 'wizard', terms: ['data', 'sql', 'supabase', 'langfuse', 'graph', 'prompt', 'analysis'] },
  { group: 'elf', terms: ['frontend', 'design', 'theme', 'css', 'react', 'ui', 'component'] },
  { group: 'goblin', terms: ['cron', 'cli', 'command', 'automation', 'dispatch', 'worker'] },
  { group: 'samurai', terms: ['validator', 'qa', 'review', 'test', 'closeout'] },
  { group: 'angel', terms: ['report', 'client', 'profile', 'resume', 'polish'] },
  { group: 'dragon', terms: ['strategy', 'architect', 'leaderboard', 'executive', 'expert'] },
  { group: 'spirit', terms: ['memory', 'second-brain', 'vault', 'knowledge', 'graphify'] },
];

function hashString(value) {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return Math.abs(hash >>> 0);
}

function textFor(item) {
  return [
    item.kind,
    item.slug,
    item.title,
    item.path,
    item.owner,
    item.description,
    item.triggers,
    item.blurb,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function pickFromGroup(group, seed) {
  const files = AVATAR_GROUPS[group] || AVATAR_GROUPS.elf;
  return files[hashString(seed) % files.length];
}

function exactTacRole(text) {
  if (!text.includes('tac')) return null;
  const role = TAC_ROLE_AVATARS.find(([term]) => text.includes(term));
  return role?.[1] || null;
}

function chooseGroup(item, text) {
  const match = KEYWORD_GROUPS.find((rule) => rule.terms.some((term) => text.includes(term)));
  if (match) return match.group;

  const groups = KIND_GROUPS[item.kind] || KIND_GROUPS.skill;
  return groups[hashString(text || item.slug || item.path || item.kind || 'capability') % groups.length];
}

export function getCapabilityAvatar(item) {
  const text = textFor(item);
  const direct = exactTacRole(text);
  const group = direct ? 'tac-team' : chooseGroup(item, text);
  const seed = `${item.kind || 'capability'}:${item.slug || item.title || item.path || text}`;
  const src = direct || pickFromGroup(group, seed);
  const label = item.slug || item.title || item.path || 'Capability';

  return {
    src,
    group,
    alt: `${label} avatar`,
  };
}

