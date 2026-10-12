# The invite email

Sent to one person at a time, by hand, when you promote them off the waitlist.

## Why it is not automated

There is no sending service wired up, deliberately. Sending mail from a project that
cannot yet prove its programs compile is a commitment to a stranger's inbox that the
project is not in a position to keep, and an automated sequence to a waitlist nobody
has read is how you end up on a list nobody is promoted from.

So this is a template you paste into, one person at a time, from your own account.

**The obligation that comes with a waitlist: you actually promote people from it.**
A list nobody is ever let in from is a wall that claims not to be one, and it costs
more trust than having no list at all. If you cannot commit to sending these by hand
as people arrive, delete the waitlist and say the beta is closed. That is better
than a form that quietly does nothing.

---

## The email

**Subject:** you are in the Sluice beta

```
Hi,

You asked to be on the list for Sluice and you are in. Here is your invite:

  https://sluice-beryl.vercel.app/invite/XXXXXXXXXX

Open it, connect the wallet you want to use Sluice with, and it binds the invite to
that wallet. After that /app opens for you.

Three things worth knowing before you click:

Everything runs on devnet. The money is not real, the tokens are not worth anything,
and no step of this can cost you anything. If a screen shows a dollar figure, it is
showing you what the mechanism does, not what you would receive.

A wallet is not required to have been in the past. If you do not have one, reply to
this email and I will help you make one before the beta rather than during it. That
is not a polite offer, most of the people this is built for do not have one yet and
I would rather help than gate.

The code is single use and lasts fourteen days. If it expires, reply and I will send
another. If you forward it, it still works for whoever you sent it to, which is
fine, but it then stops working for you.

This is a small beta and you will be able to break things. That is the point of it.
When something breaks, reply to this email and tell me what you did first. I am
reading every one.

What I would most like from you, if you have a moment: try to issue something you
actually want financed. A real invoice, a royalty you are owed, anything with a
number attached. The parts of this that are hardest to get right only show up when
the asset is real, and I would rather find that out from you than from a fixture.

Psycho
@xoxo_psycho
https://sluice-beryl.vercel.app
```

---

## Why it is written that way

**It leads with the code, not with the story.** They joined a waitlist, they have been
waiting, the first thing they need is the thing they came for.

**Devnet is stated before anything else can mislead them.** A person who opens the
app and sees a dollar figure has to know within one screen that it is not real money.
This is the single most important line in the email.

**The wallet paragraph is a real offer, not a courtesy.** Sluice's Groups design
exists for people who are not buying SOL to pay gas. If the only path in requires a
wallet they do not have, the waitlist is a filter for the wrong people and the
project has quietly failed at the thing it says it is for.

**The forwarding line is honest rather than reassuring.** Email-bound codes are tied
to an email in their signed payload, so a forwarded link does not work for the
recipient. Say that plainly rather than implying the code is a secret, because a
person who believes their code is unguessable will not tell you if they leak it.

**The last paragraph asks for something specific.** "Tell me if you break it" gets
you bug reports. "Try to issue something you actually want financed" gets you the
findings that decide whether the mechanism works. It is also the sentence most
likely to be quoted back to you when it does.

---

## Sending it

Open the link in the browser first and confirm the code renders the "Your code works"
page. A pasted code with a typo reads as "not one of ours", and they will conclude
the invite was withdrawn rather than that you slipped.

Codes are printed by `node scripts/waitlist.mjs invite their@email`. It prints the
code and the full URL on separate lines so you cannot transpose them.

## The people you decline

Not everyone gets in, particularly at the start when you are trying to find what
breaks. If someone is not getting a code, say so. A short note that the beta is
full for now and you will be on the list is worth more than silence, because silence
is indistinguishable from having been forgotten.

---

## One thing that is not in this template

There is no referral reward and there will not be one. Every piece of research on
invite-driven launches converges on the same thing: attach a reward to an invite and
the queue stops measuring interest and starts measuring bot throughput. Sluice has no
token, so there is nothing to pay with. The use cap and the expiry are the mechanism
by which an invite spreads, and they are already in place.
