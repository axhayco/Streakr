function testFilter(istTotalMinutes, userTime) {
    const [rh, rm] = userTime.split(':').map(Number);
    const userMinutes = rh * 60 + rm;
    const diff = istTotalMinutes - userMinutes;
    return diff >= 0 && diff < 30;
}

const tests = [
    { now: "20:00", user: "20:00", expected: true },
    { now: "20:05", user: "20:00", expected: true },
    { now: "20:29", user: "20:00", expected: true },
    { now: "20:30", user: "20:00", expected: false },
    { now: "20:30", user: "20:15", expected: true },
    { now: "20:00", user: "19:40", expected: true },
    { now: "20:00", user: "19:30", expected: false },
];

tests.forEach(t => {
    const [h, m] = t.now.split(':').map(Number);
    const nowMins = h * 60 + m;
    const result = testFilter(nowMins, t.user);
    console.log(`Now: ${t.now}, User: ${t.user} => Result: ${result} (Expected: ${t.expected}) ${result === t.expected ? '✅' : '❌'}`);
});
