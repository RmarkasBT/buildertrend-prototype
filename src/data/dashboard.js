// Shape (past due/due today/action items counts, activity feed, agenda,
// updates-shared-with-clients count) matches the real job dashboard. Values
// invented.
export const dashboardByJob = {
  j1: {
    pastDue: 0,
    dueToday: 0,
    actionItems: 0,
    updatesSharedThisMonth: 3,
    activity: [
      { id: 'a1', who: 'Sam Okafor', when: 'Aug 19, 2026, 4:12 PM', action: 'added an attachment to a Bill', detail: 'Round Rock Lumber Co. / Framing package' },
      { id: 'a2', who: 'Sam Okafor', when: 'Aug 19, 2026, 4:10 PM', action: 'marked a Bill as Ready For Payment', detail: 'Round Rock Lumber Co. / Framing package' },
      { id: 'a3', who: 'Dana Ferris', when: 'Aug 18, 2026, 11:02 AM', action: 'commented on a Daily Log', detail: 'Aug 18 daily log' },
    ],
  },
  j3: {
    pastDue: 1,
    dueToday: 2,
    actionItems: 1,
    updatesSharedThisMonth: 0,
    activity: [
      { id: 'a4', who: 'Ellie Marsh', when: 'Aug 19, 2026, 5:38 PM', action: 'added a Daily Log', detail: 'Aug 19 daily log' },
    ],
  },
  j2: { pastDue: 0, dueToday: 0, actionItems: 0, updatesSharedThisMonth: 0, activity: [] },
  j4: { pastDue: 0, dueToday: 0, actionItems: 0, updatesSharedThisMonth: 0, activity: [] },
  j5: { pastDue: 0, dueToday: 0, actionItems: 0, updatesSharedThisMonth: 0, activity: [] },
  j6: { pastDue: 0, dueToday: 0, actionItems: 0, updatesSharedThisMonth: 0, activity: [] },
}
