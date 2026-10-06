export type ThreePeTemplate = {
  id: string;
  title: string;
  overview: string;
  venue: string;
  phases: { name: string; tasks: string[] }[];
};

const internalComms = [
  "Fill out all fields in Airtable",
  "Create presale / VIP info Doc",
];

const creative = ["File Creative ticket"];

const modal = [
  "Upload modal image — Size should be 1600x672 or 3200x1344",
  "Configure modal and attach to events — Temporary generic modal images",
  "Configure presales for modal",
];

const map = [
  "File Mapping and VFS ticket",
  "Attach map to event(s) and set to seat selection",
  "Fake GA seat ordinal QA — ensure seat ordinals match seat numbers in 'fake GA' sections",
  "Check normalization",
];

const performerImage = [
  "Upload performer image",
  "Attach performer image to event(s)",
];

const resale = [
  "Enable listing verification (if necessary) — Required for Amerant, Delta, RMFH, Nissan, AT&T, SFS, Northwest, Providence",
  "Turn SellerDirect on for event and parking at the appropriate time",
];

const ticket = [
  "Custom Ticket — Upload assets and attach to events",
  "Appropriate banners configured — VIP, Floor, 2-Day, etc",
  'Meta Override, if applicable — Hiding row/seat on GA sections not set as "Fake GA"',
];

const oa = [
  "Set ticket limitations — Set within 'rules' for event, set within 'events' for specific price types/areas",
  "Configure prompts, if applicable",
  "Enable rotating barcodes, if applicable",
  "Permission Amplify users, if applicable",
];

const vroom = [
  "Set timelines — Generally in blockade 15 minutes before sale",
  "Configure Contentful blockade page — example",
];

const paymentMethods = [
  "Set payment method limitations in Open Admin, if applicable",
  "File International Payments Ticket, if applicable — example",
];

const testing = [
  "Make a test purchase — Cart a seat with all Coupons. Test purchase all Price Types and both GA & reserved seating.",
  "Deal Score — Remove promo code condition from Staff Tester rule after testing is complete",
];

const postOnsaleQa = [
  "Verify that any combo and/or ancillary events are nested properly.",
  "Place event ticketing letter in inside the folder",
];

function makeThreePeTemplate(input: {
  id: string;
  title: string;
  overview: string;
  venue: string;
  feeTerms: string;
}): ThreePeTemplate {
  return {
    id: input.id,
    title: input.title,
    overview: input.overview,
    venue: input.venue,
    phases: [
      { name: "Internal Comms", tasks: internalComms },
      { name: "Creative", tasks: creative },
      { name: "Modal", tasks: modal },
      { name: "Map", tasks: map },
      { name: "Performer Image", tasks: performerImage },
      { name: "Resale", tasks: resale },
      { name: "Ticket", tasks: ticket },
      { name: "OA", tasks: oa },
      { name: "Vroom", tasks: vroom },
      { name: "Payment Methods", tasks: paymentMethods },
      { name: "Testing", tasks: testing },
      {
        name: "Fee QA",
        tasks: [`Review fee terms and complete audit for event. — ${input.feeTerms}`],
      },
      { name: "Post Onsale QA", tasks: postOnsaleQa },
    ],
  };
}

export const threePeTemplates: ThreePeTemplate[] = [
  makeThreePeTemplate({
    id: "commanders-template-3pe",
    title: "Commanders Template 3PE",
    overview: "Washington Commanders",
    venue: "Northwest Stadium",
    feeTerms: "Commanders Fee Terms",
  }),
  makeThreePeTemplate({
    id: "cowboys-template-3pe",
    title: "Cowboys Template 3PE",
    overview: "Dallas Cowboys",
    venue: "AT&T Stadium",
    feeTerms: "Cowboys Fee Terms",
  }),
  makeThreePeTemplate({
    id: "cowboys-non-at-t-template-3pe",
    title: "Cowboys (Non-AT&T) Template 3PE",
    overview: "Dallas Cowboys (Non AT&T Event)",
    venue: "Ford Center",
    feeTerms: "Cowboys Fee Terms",
  }),
  makeThreePeTemplate({
    id: "panthers-template-3pe",
    title: "Panthers Template 3PE",
    overview: "Florida Panthers",
    venue: "Amerant Bank Arena",
    feeTerms: "Panthers Fee Terms",
  }),
  makeThreePeTemplate({
    id: "war-memorial-template-3pe",
    title: "War Memorial Template 3PE",
    overview: "Florida Panthers",
    venue: "War Memorial",
    feeTerms: "Panthers Fee Terms",
  }),
];
