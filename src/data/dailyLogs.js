// Seed fixtures for the Daily Logs feature. Field shape matches the live
// /app/DailyLogAdd form and /app/DailyLogView detail page one-for-one:
// title (optional, max 50), date, notes, tags, the four Permissions > Share
// toggles, notify users, the weather block, photos, and draft/published
// status. Weather is intentionally omitted here — server/dailyLogRoutes.js
// snapshots it from server/weather.js at insert time, exactly as it does
// for a log created through the UI.
//
// `photos` carry a `tone` instead of a file: there are no real job-site
// images in this repo, so the UI renders a deterministic tinted tile per
// photo. Everything else about the photo grid ("View all (N)", the lightbox,
// the +N overflow tile) behaves as it does live.
const photo = (id, caption, tone) => ({ id, caption, tone })

export const dailyLogsByJob = {
  j1: [
    {
      id: 'dl1',
      title: '',
      date: '2026-08-21',
      notes:
        'Progress:\nDrywall hung in the great room and both guest bedrooms. Tapers start Monday.\nElectrician finished trim-out on the west wall.\n\nIssues:\nSouth window rough opening is 1" narrow — Miguel is re-framing Monday AM.\n\nMaterials Delivered:\nDrywall (54 sheets, 5/8" Type X) — Hill Country Building Supply\n',
      tags: ['Drywall', 'Framing'],
      shareInternal: true, shareSubs: true, shareClient: false, isPrivate: false,
      notifyUsers: [],
      includeWeather: true, includeWeatherNotes: false, weatherNotes: '',
      photos: [
        photo('p1', 'Great room drywall', 'stone'),
        photo('p2', 'Guest bed 1', 'slate'),
        photo('p3', 'West wall trim-out', 'sand'),
        photo('p4', 'South window RO', 'clay'),
        photo('p5', 'Drywall delivery', 'moss'),
      ],
      status: 'published',
      likes: ['Sam Okafor'],
      createdBy: 'Sam Okafor',
      createdAt: '2026-08-21T23:12:00.000Z',
      comments: [
        { author: 'Ellie Marsh', body: 'Nice pace this week. Did the inspector reschedule?', createdAt: '2026-08-22T13:20:00.000Z' },
        { author: 'Sam Okafor', body: 'Tuesday 9am. Confirmed with the city this morning.', createdAt: '2026-08-22T14:02:00.000Z' },
      ],
    },
    {
      id: 'dl2',
      title: 'Rough-in inspection passed',
      date: '2026-08-19',
      notes:
        'Progress:\nPlumbing rough inspection passed on the first walk. Job site area cleanliness good.\n\nIssues:\n\nMaterials Delivered:\n',
      tags: ['Plumbing', 'Inspection'],
      shareInternal: true, shareSubs: false, shareClient: true, isPrivate: false,
      notifyUsers: ['Dana Ferris'],
      includeWeather: true, includeWeatherNotes: true,
      weatherNotes: 'Crew broke early — heat index over 105°F by 2pm.',
      photos: [photo('p6', 'Rough-in, north bath', 'slate'), photo('p7', 'Stair landing', 'stone')],
      status: 'published',
      likes: [],
      createdBy: 'Sam Okafor',
      createdAt: '2026-08-19T22:40:00.000Z',
      comments: [],
    },
    {
      id: 'dl3',
      title: '',
      date: '2026-08-17',
      notes:
        'Progress:\nHVAC rough-in started. Ductwork run through the attic chase.\n\nIssues:\nSupply register in the primary bath conflicts with the exhaust fan location — coordinating with the plumber.\n\nMaterials Delivered:\n',
      tags: ['HVAC'],
      shareInternal: true, shareSubs: true, shareClient: false, isPrivate: false,
      notifyUsers: [],
      includeWeather: true, includeWeatherNotes: false, weatherNotes: '',
      photos: [],
      status: 'published',
      likes: ['Ellie Marsh', 'Sam Okafor'],
      createdBy: 'Ellie Marsh',
      createdAt: '2026-08-17T21:05:00.000Z',
      comments: [{ author: 'Ellie Marsh', body: 'Flagging this for the Monday coordination call.', createdAt: '2026-08-18T15:30:00.000Z' }],
    },
    {
      id: 'dl4',
      title: 'Punch walk prep notes',
      date: '2026-08-22',
      notes: 'Progress:\nDraft — walking the site Monday to build the punch list.\n\nIssues:\n\nMaterials Delivered:\n',
      tags: [],
      shareInternal: false, shareSubs: false, shareClient: false, isPrivate: true,
      notifyUsers: [],
      includeWeather: false, includeWeatherNotes: false, weatherNotes: '',
      photos: [],
      status: 'draft',
      likes: [],
      createdBy: 'Ruhaab Markas',
      createdAt: '2026-08-22T16:00:00.000Z',
      comments: [],
    },
  ],
  j3: [
    {
      id: 'dl5',
      title: '',
      date: '2026-08-20',
      notes:
        'Progress:\nFoundation cured, forms stripped. Crew moves to framing layout tomorrow.\n\nIssues:\n\nMaterials Delivered:\nLumber package (2x6, 2x10) — Round Rock Lumber Co.\n',
      tags: ['Foundation', 'Framing'],
      shareInternal: true, shareSubs: true, shareClient: true, isPrivate: false,
      notifyUsers: ['Priya Chandran'],
      includeWeather: true, includeWeatherNotes: false, weatherNotes: '',
      photos: [
        photo('p8', 'Forms stripped, east side', 'sand'),
        photo('p9', 'Slab edge detail', 'stone'),
        photo('p10', 'Lumber drop', 'moss'),
        photo('p11', 'Layout lines', 'slate'),
        photo('p12', 'Site from the street', 'clay'),
        photo('p13', 'Anchor bolts', 'stone'),
        photo('p14', 'Utility stub-outs', 'slate'),
        photo('p15', 'Grading, north lot line', 'moss'),
      ],
      status: 'published',
      likes: ['Ellie Marsh'],
      createdBy: 'Ellie Marsh',
      createdAt: '2026-08-20T23:55:00.000Z',
      comments: [{ author: 'Ruhaab Markas', body: 'Slab looks clean. Any honeycombing on the north edge?', createdAt: '2026-08-21T12:11:00.000Z' }],
    },
    {
      id: 'dl6',
      title: '',
      date: '2026-08-18',
      notes:
        'Progress:\nFoundation pour complete, inspector signed off.\n\nIssues:\nReady-mix delivery ran 40 minutes late; finishers stayed to 7pm to close it out.\n\nMaterials Delivered:\n',
      tags: ['Foundation', 'Concrete'],
      shareInternal: true, shareSubs: false, shareClient: false, isPrivate: false,
      notifyUsers: [],
      includeWeather: true, includeWeatherNotes: false, weatherNotes: '',
      photos: [photo('p16', 'Pour in progress', 'stone'), photo('p17', 'Finishing crew', 'sand'), photo('p18', 'Final screed', 'slate')],
      status: 'published',
      likes: [],
      createdBy: 'Ellie Marsh',
      createdAt: '2026-08-18T23:30:00.000Z',
      comments: [],
    },
  ],
  j4: [
    {
      id: 'dl7',
      title: 'Demo complete',
      date: '2026-08-21',
      notes:
        'Progress:\nInterior demo complete through the kitchen and both baths. Dumpster swapped Thursday.\n\nIssues:\nFound knob-and-tube in the north wall cavity — electrician quoting the replacement run.\n\nMaterials Delivered:\n',
      tags: ['Demo', 'Electrical'],
      shareInternal: true, shareSubs: true, shareClient: true, isPrivate: false,
      notifyUsers: ['Isabel Alvarez', 'Marco Alvarez'],
      includeWeather: true, includeWeatherNotes: false, weatherNotes: '',
      photos: [photo('p19', 'Kitchen, post-demo', 'clay'), photo('p20', 'Knob-and-tube found', 'slate')],
      status: 'published',
      likes: ['Ruhaab Markas'],
      createdBy: 'Ellie Marsh',
      createdAt: '2026-08-21T20:15:00.000Z',
      comments: [],
    },
  ],
  j2: [],
  j5: [],
  j6: [],
}
