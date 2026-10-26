// content.js: all editable text and settings. Only edit the values in quotes.
window.QUIZ = {
  settings: {
    // Google Apps Script web app URL (see section 9). Leave empty to run the site in demo mode, where nothing is sent.
    endpoint: "",
    // Entries close at 11:59:59 PM Pacific Time on Nov 15, 2026 (PST is UTC-8). [ASSUMPTION A1]
    entryClosesAt: "2026-11-16T07:59:59Z",
    makomUrl: "https://makom-il.org.il/en/home",
    instagramUrl: "https://www.instagram.com/makom_org",
    facebookUrl: "https://www.facebook.com/makominisrael/",
    privacyUrl: "https://makom-il.org.il/en/privacy-policy/",
    rulesUrl: "rules.html",
    consentVersion: "v1-draft"   // Increase whenever the consent text changes. Each sheet row records this value.
  },

  welcome: {
    eyebrow: "MAKOM Interactive Quiz | JNF-USA Global Conference 2026",
    title: "Discover Israel Through Community",
    tagline: "5 Questions. 5 Places. One Mission: Building Israel's Future.",
    giveaway: "Answer 5 quick questions, then enter our giveaway for a chance to win a handmade Hanukkiah crafted by members of our community in northern Israel.",
    finePrint: "No purchase necessary. Everyone who completes the form may enter, whatever their score. See the Official Rules.", // [LEGAL]
    startButton: "Start the Quiz"
  },

  questions: [
    {
      place: "Mitzpe Ramon",
      question: "What makes Mitzpe Ramon one of Israel's most unique desert towns?",
      answers: [
        "It is located on the shores of the Dead Sea",
        "It overlooks one of the world's largest erosion craters",
        "It is home to Israel's largest forest"
      ],
      correct: 1,   // Index of the correct answer, counting from 0. Here 1 means the second answer (B).
      fact: "150 educators moved to Mitzpe Ramon as a community, choosing to make the Negev their home. Today, they work in local schools and informal education programs, strengthening education and shaping the town's future."
    },
    {
      place: "Kiryat Shmona",
      question: "Which Israeli city is known as the northernmost city in Israel?",
      answers: ["Tiberias", "Kiryat Shmona", "Nahariya"],
      correct: 1,
      fact: "In summer 2026, 55 new families moved to Kiryat Shmona through MAKOM's community-led demographic growth initiative. With a goal of welcoming 300 new families, MAKOM is helping rebuild the city's future through strong, connected communities."
    },
    {
      place: "Nahariya",
      question: "Which sea borders the northern Israeli city of Nahariya?",
      answers: ["The Red Sea", "The Mediterranean Sea", "The Dead Sea"],
      correct: 1,
      fact: "MAKOM's artists' communities are active in 15 schools in Nahariya, with a team of 25 educators and facilitators. Together, they reach approximately 1,150 students through arts and educational programs."
    },
    {
      place: "Sderot",
      question: "Which Israeli city is located approximately one kilometer from the Gaza border?",
      answers: ["Sderot", "Dimona", "Ashkelon"],
      correct: 0,
      fact: "MAKOM's young adult communities in Sderot bring together residents and families through community activities, cultural events, and local initiatives. Together, they strengthen resilience, create meaningful connections, and build a sense of belonging."
    },
    {
      place: "Acre (Akko)",
      question: "Which famous historical figure attempted to conquer Acre in 1799 but failed?",
      answers: ["Alexander the Great", "Napoleon Bonaparte", "Julius Caesar"],
      correct: 1,
      fact: "Through MAKOM's Shared Purpose Accelerator, grassroots organizations in Acre have joined forces to develop a collaborative educational initiative. By working together, they are strengthening local connections and creating new opportunities for the city's residents."
    }
  ],

  result: {
    scoreLine: "You scored {score} out of {total}",
    scoreMessages: {          // Chosen by score. The highest threshold that is less than or equal to the score wins.
      "0": "Thanks for exploring with us!",
      "3": "Great job!",
      "5": "Perfect score!"
    },
    title: "You've Explored Israel. Now Discover the Communities Building Its Future!",
    body: "From the Galilee to the Negev, MAKOM brings people together to build stronger communities, create opportunities, and shape Israel's future.",
    slogan: "Building Israel's Future Through Community.",
    formIntro: "Enter your details for a chance to win a special prize!",
    prizeName: "Hanukkiah, Fan Design",
    prizeDescription: "A clean, minimalist Hanukkiah in light-toned polymer concrete, handmade with love by our friends, people with disabilities in northern Israel. Approx. 30 x 5 x 3 cm (11.8 x 2 x 1.2 in). Each piece is handmade, so sizes may vary slightly.",
    consentLabel: "I agree to the Official Rules and consent to MAKOM and Jewish National Fund-USA using my name, email and phone number only to run this giveaway and to contact me by email, phone or WhatsApp if I win. My details will not be used for marketing.", // [LEGAL]
    submitButton: "Enter the Giveaway",
    closedMessage: "The giveaway is now closed. Thank you for playing!"
  },

  thanks: {
    title: "Thank you for playing!",
    body: "You're now part of the MAKOM story. Together, we're building a stronger future for Israel, one community at a time.",
    drawNote: "The winner will be drawn on November 16, 2026 and contacted by email or WhatsApp.", // [ASSUMPTION A1]
    button: "Discover MAKOM",
    social: "Follow MAKOM on social media to see our communities in action.",
    pendingNote: "Your entry is saved on this phone and will be sent automatically when you're back online. Please keep this page open, or reopen it later."
  }
};
