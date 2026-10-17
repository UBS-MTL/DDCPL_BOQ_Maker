import { prisma } from "@/lib/prisma";

const ACTIVE_STATUSES = ["approved", "sent", "follow_up", "negotiation"];
const EXPIRABLE_STATUSES = ["approved", "sent", "follow_up", "negotiation"];

function startOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function diffDays(from: Date, to: Date): number {
  const a = startOfToday(from).getTime();
  const b = startOfToday(to).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function parseReminderDays(raw: string | undefined): number[] {
  if (!raw) return [7, 3, 1];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const days = parsed
        .map((d) => Number(d))
        .filter((d) => Number.isFinite(d) && d >= 0 && d <= 365)
        .sort((a, b) => b - a);
      if (days.length) return days;
    }
  } catch {
    /* noop */
  }
  return [7, 3, 1];
}

export type SweepResult = {
  expired: number;
  followUpNotifications: number;
  expiryNotifications: number;
};

export async function runReminderSweep(): Promise<SweepResult> {
  const now = new Date();
  const today = startOfToday(now);
  const result: SweepResult = { expired: 0, followUpNotifications: 0, expiryNotifications: 0 };

  const settings = await prisma.companySetting.findUnique({ where: { id: "singleton" } });
  const reminderDays = parseReminderDays(settings?.reminderDays);
  const horizon = Math.max(...reminderDays);
  const horizonDate = new Date(today.getTime() + horizon * 24 * 60 * 60 * 1000);

  const expiringSoon = await prisma.quotation.findMany({
    where: {
      status: { in: EXPIRABLE_STATUSES },
      validTill: { not: null, lte: horizonDate },
    },
    select: {
      id: true,
      quoteNumber: true,
      title: true,
      status: true,
      validTill: true,
      followUpDate: true,
      userId: true,
      customer: { select: { name: true } },
    },
  });

  for (const q of expiringSoon) {
    if (!q.validTill) continue;
    const days = diffDays(today, q.validTill);

    if (days < 0) {
      await prisma.quotation.update({
        where: { id: q.id },
        data: { status: "expired" },
      });
      result.expired += 1;

      const existingExpired = await prisma.notification.findFirst({
        where: { quotationId: q.id, type: "expired", dueDate: q.validTill },
        select: { id: true },
      });
      if (!existingExpired) {
        await prisma.notification.create({
          data: {
            userId: q.userId,
            type: "expired",
            title: `${q.quoteNumber} has expired`,
            body: `${q.title} — ${q.customer.name}`,
            quotationId: q.id,
            dueDate: q.validTill,
          },
        });
      }
      continue;
    }

    const existing = await prisma.notification.findFirst({
      where: { quotationId: q.id, type: "expiry", dueDate: q.validTill },
      select: { id: true },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          userId: q.userId,
          type: "expiry",
          title: `${q.quoteNumber} expires ${days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}`,
          body: `${q.title} — ${q.customer.name}`,
          quotationId: q.id,
          dueDate: q.validTill,
        },
      });
      result.expiryNotifications += 1;
    }
  }

  const followUps = await prisma.quotation.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
      followUpDate: { not: null, lte: horizonDate },
    },
    select: {
      id: true,
      quoteNumber: true,
      title: true,
      followUpDate: true,
      userId: true,
      customer: { select: { name: true } },
    },
  });

  for (const q of followUps) {
    if (!q.followUpDate) continue;
    const days = diffDays(today, q.followUpDate);
    const relevantTier = reminderDays.find((d) => days <= d && days >= 0);
    const overdue = days < 0;
    if (!relevantTier && !overdue) continue;

    const existing = await prisma.notification.findFirst({
      where: { quotationId: q.id, type: "follow_up", dueDate: q.followUpDate },
      select: { id: true },
    });
    if (existing) continue;

    const whenLabel = overdue
      ? `overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`
      : days === 0
        ? "due today"
        : `due in ${days} day${days === 1 ? "" : "s"}`;

    await prisma.notification.create({
      data: {
        userId: q.userId,
        type: "follow_up",
        title: `Follow up ${whenLabel}: ${q.quoteNumber}`,
        body: `${q.title} — ${q.customer.name}`,
        quotationId: q.id,
        dueDate: q.followUpDate,
      },
    });
    result.followUpNotifications += 1;
  }

  return result;
}
