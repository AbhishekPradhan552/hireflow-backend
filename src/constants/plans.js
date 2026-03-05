export const PLANS = {
  FREE: {
    name: "Free",
    priceMonthly: 0,
    jobsLimit: 20,
    resumeLimit: 50,
  },
  PRO: {
    name: "Pro",
    priceMonthly: 999,
    jobsLimit: 50,
    resumeLimit: 500,
  },
  TEAM: {
    name: "Team",
    priceMonthly: 2999,
    jobsLimit: null,
    resumeLimit: null, //null= unlimited
  },
};
