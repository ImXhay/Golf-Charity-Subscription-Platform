# Golf Charity Subscription Platform

A full-stack web application built for the Digital Heroes Trainee Selection Process. This platform combines golf performance tracking, a monthly draw-based reward engine, and charitable giving.

## Live Demo
**URL:** [https://golf-charity-subscription-platform-blond.vercel.app](https://golf-charity-subscription-platform-blond.vercel.app)

## Test Credentials
* **User Login:** [Insert your test user email] / [Insert password]
* **Admin Login:** [Insert your admin email] / [Insert password]

## Core Features Implemented
* **Subscription Engine:** Stripe integration for monthly/yearly plans with 30-day rolling expiration logic.
* **Score Management:** Users can input Stableford scores (1-45), with the system strictly retaining only a rolling list of the 5 most recent entries.
* **Charity Integration:** Users can allocate a minimum of 10% of their subscription to a charity of their choice, with options for direct donations.
* **Draw & Reward System:** Admin-controlled monthly draw engine that calculates prize pools based on active subscribers.
* **Winner Verification:** Secure screenshot upload system for verifying winning claims.

## Tech Stack
* **Frontend:** Angular 17 (Standalone Components, Signals)
* **Backend / Database:** Supabase (PostgreSQL, Authentication, Storage)
* **Payments:** Stripe Payment Links
* **Deployment:** Vercel