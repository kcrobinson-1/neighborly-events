# Neighborly Scavenger Game

`Neighborly Scavenger Game` is a mobile-first neighborhood event quiz designed to help local organizers raise sponsor revenue and drive attendee engagement through a short, game-like experience.

The concept is simple:

- attendees scan a QR code at an event
- complete a fast 5-7 question experience
- see local sponsors woven into the game
- finish with a raffle-entry confirmation screen

The product is intended for community events like concerts, fairs, and neighborhood markets, where the experience needs to be fast, outdoor-friendly, and easy to run without technical overhead.

## Goals

- Create a fundraiser that feels fun rather than transactional
- Give local sponsors active visibility instead of passive logo placement
- Keep the attendee flow under 2 minutes
- Make setup simple enough for organizers to run with minimal training

## Current Status

This repository is currently in the planning and product-definition stage. It contains product, UX, architecture, and milestone documentation, but not yet a full application implementation.

Initial validation target:

- Madrona Music in the Playfield

## Documentation

- [Product Overview](./docs/product.md) explains the problem, users, value proposition, and success criteria.
- [UX Philosophy and Experience](./docs/experience.md) describes how the attendee and volunteer experience should feel and flow.
- [Architecture Notes](./docs/architecture.md) defines the system shape, data model, and frontend/backend responsibilities.
- [Development Direction](./docs/dev.md) captures framework choices, technical defaults, open implementation questions, and milestones.

## Planned Experience

The intended attendee experience is:

1. Scan QR code
2. Start immediately with no login
3. Answer one question at a time in a lightweight SPA flow
4. Complete the quiz in under 2 minutes
5. Show a clear completion screen to receive a raffle ticket

The UX direction emphasizes:

- mobile-first design
- outdoor readability
- one decision per screen
- sponsor visibility without interruptive ads
- a clear, verifiable completion state

## MVP Boundaries

The current MVP intentionally avoids:

- generalized SaaS complexity
- advanced analytics dashboards
- heavy anti-fraud systems
- billing and payments infrastructure

## Success Criteria

- At least 30% of estimated attendees start the quiz
- At least 70% of participants complete it
- Median completion time stays at or below 2 minutes
- Organizers can set up the experience in under 1 hour

## Next Steps

- turn the docs into an implementation plan
- build the mobile-first quiz prototype
- validate the experience in a live neighborhood event
