// One-off SEC-1 remediation: rotate every event onsite password that was
// exposed through the public DJ API. Run INSIDE the api container:
//   docker exec deck-salone-api node /tmp/rotate-onsite-passwords.js
// Prints each event with its new temporary password for owner notification.
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  const bytes = require('crypto').randomBytes(10);
  for (let i = 0; i < 10; i++) pw += chars[bytes[i] % chars.length];
  return pw;
}

(async () => {
  const events = await prisma.event.findMany({
    where: { onsitePassword: { not: null } },
    select: { id: true, title: true, date: true, djId: true },
  });
  console.log(`Found ${events.length} event(s) with onsite passwords set.`);
  const results = [];
  for (const ev of events) {
    const plain = generatePassword();
    const hash = await bcrypt.hash(plain, 12);
    await prisma.event.update({ where: { id: ev.id }, data: { onsitePassword: hash } });
    results.push({ title: ev.title, date: ev.date, newPassword: plain });
    console.log(`✔ rotated: ${ev.title}`);
  }
  console.log('\n=== NEW ONSITE PASSWORDS (share with event owners) ===');
  for (const r of results) {
    console.log(`${r.title} | ${r.date} | new password: ${r.newPassword}`);
  }
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
