/**
 * Outbound email, for invites only.
 *
 * One provider, one purpose. This sends a beta invitation and nothing else, and
 * there is no newsletter, no sequence and no drip campaign, which is the same
 * promise the waitlist form makes to the person reading it. A mailer that can send
 * arbitrary mail to arbitrary lists is a spam relay the moment it is misused, and
 * this project's reputation on a domain is worth more than the convenience of a
 * general purpose helper.
 *
 * ## The domain constraint, stated up front
 *
 * Resend will only send to arbitrary recipients from a verified domain. Without one
 * the API accepts a single verified address, which is Resend's own testing
 * address, and mail sent that way only ever arrives at the account owner. That is
 * fine for verifying the wiring and useless for inviting anybody.
 *
 * So: {@link canSend} is false until `RESEND_FROM_DOMAIN` is set, and the admin
 * panel says so rather than appearing broken. Sluice has no domain yet, which is a
 * real gap and `BRAND_AND_DOMAIN.md` is where that gets resolved.
 */

/** Resend's HTTP endpoint. The only outbound host this project talks to. */
const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Why a send did not happen. Each maps to a distinct message in the admin panel. */
export type SendRejection =
  | { readonly reason: "unconfigured"; readonly detail: string }
  | { readonly reason: "unverified-domain"; readonly detail: string }
  | { readonly reason: "provider-error"; readonly detail: string };

/**
 * Whether the mailer can actually deliver.
 *
 * Checked before a code is minted, not after. Minting first and discovering the
 * send failed would consume the single use of an invite nobody received, which is
 * the worst outcome available here: the code is spent, the email never arrived, and
 * the person is locked out of a beta they were told they were in.
 */
export function canSend(): { ready: true } | { ready: false; detail: string } {
  if (!process.env.RESEND_API_KEY) {
    return {
      ready: false,
      detail: "RESEND_API_KEY is not set. Mail cannot be sent.",
    };
  }
  if (!process.env.RESEND_FROM_DOMAIN) {
    return {
      ready: false,
      detail:
        "RESEND_FROM_DOMAIN is not set. Resend only sends to arbitrary recipients from a verified domain, so a code would be minted and never arrive.",
    };
  }
  return { ready: true };
}

/** The subject line. Fixed, because a variable subject is how invites get filtered. */
const SUBJECT = "you are in the Sluice beta";

/**
 * The body.
 *
 * Plain text on purpose. An HTML invite from a devnet beta to a stranger's inbox
 * gets marked promotional on format alone, and this is a message that has to be
 * read. Every line earns its place: the code first, then the two things that would
 * mislead them (devnet, the wallet), then one thing worth asking for.
 */
function body(code: string): string {
  const origin = process.env.PUBLIC_ORIGIN ?? "https://sluice-beryl.vercel.app";
  return [
    "Hi,",
    "",
    "You asked to be on the list for Sluice and you are in. Here is your invite:",
    "",
    `  ${origin}/invite/${code}`,
    "",
    "Open it, connect the wallet you want to use Sluice with, and it binds the",
    "invite to that wallet. After that the terminal opens for you.",
    "",
    "Three things worth knowing before you click.",
    "",
    "Everything runs on devnet. The money is not real, the tokens are not worth",
    "anything, and no step of this can cost you anything. If a screen shows a",
    "dollar figure it is showing you what the mechanism does, not what you would",
    "receive.",
    "",
    "A wallet is not required to have been in the past. If you do not have one,",
    "reply to this email and I will help you make one before the beta rather than",
    "during it. That is not a polite offer, most of the people this is built for do",
    "not have one yet and I would rather help than gate.",
    "",
    "The code is single use and lasts fourteen days. If it expires, reply and I will",
    "send another. If you forward it, it still works for whoever you sent it to,",
    "which is fine, and it then stops working for you.",
    "",
    "This is a small beta and you will be able to break things, which is the point.",
    "When something breaks, reply and tell me what you did first. I read every one.",
    "",
    "What I would most like from you, if you have a moment: try to issue something",
    "you actually want financed. A real invoice, a royalty you are owed, anything",
    "with a number attached. The parts of this that are hardest to get right only",
    "show up when the asset is real, and I would rather find that out from you than",
    "from a fixture.",
    "",
    "Psycho",
    "@xoxo_psycho",
    origin,
  ].join("\n");
}

/**
 * Sends one invite.
 *
 * Throws nothing. Every failure returns a rejection carrying the provider's own
 * text, because an admin panel that swallows the reason leaves the operator
 * guessing whether the person was emailed.
 */
export async function sendInvite(to: string, code: string): Promise<{ ok: true } | SendRejection> {
  const readiness = canSend();
  if (readiness.ready === false) {
    return { reason: "unconfigured", detail: readiness.detail };
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: `Sluice <invite@${process.env.RESEND_FROM_DOMAIN}>`,
      to: [to],
      subject: SUBJECT,
      text: body(code),
    }),
  });

  if (response.ok) return { ok: true };

  const detail = (await response.json().catch(() => ({}))) as {
    message?: string;
    name?: string;
  };
  const message = detail.message ?? `${response.status}`;

  // Resend reports an unverified domain as a 403 with its own wording. Separated so
  // the panel can say "add DNS records" rather than "something went wrong".
  if (response.status === 403 || /domain|verified/i.test(message)) {
    return { reason: "unverified-domain", detail: message };
  }
  return { reason: "provider-error", detail: message };
}
