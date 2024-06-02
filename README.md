# Queue-Bot

[![TopGG](https://top.gg/api/widget/679018301543677959.svg)](https://top.gg/bot/679018301543677959)  
[![BuyMeACoffee](https://img.shields.io/badge/BuyMeACoffee-Donate-ff9004.svg?logo=CoffeeScript&style=flat-square)](https://www.buymeacoffee.com/Arroww)  
[![Discord Support Server](https://img.shields.io/discord/678645128755150863?label=Discord&style=flat-square)](https://discord.gg/RbmfnP3)

Create voice & text channel queues. Queue Bot provides live queue displays in chat, assists in removing users in order, and allows for customization.

## Getting Started
1. [Invite the bot to your server](https://discord.com/oauth2/authorize?client_id=679018301543677959&permissions=290475024&scope=bot%20applications.commands).
2. Use `/help` and follow the instructions

## Commands
Most commands will be hidden until you have at least one queue.

### Commands for Everyone
`/help` - Get helpful info about Queue Bot  
`/join` - Join a queue  
`/leave` - Leave a queue  
`/positions` - Get your positions in all queues  
`/show` - Show queue(s)

### Admin Commands
Admin commands are restricted to server admins and users added via `/admins add`.

`/admins` - Manage admin users and roles  
`/blacklist` - Manage blacklisted users and roles  
`/clear` - Clear a queue. (shortcut for /members delete ALL)  
`/displays` - Manage display channels  
`/members` - Manage queue members  
`/move` - Change the position of a queue member (same as /member set position)  
`/prioritize` - Manage prioritized users and roles  
`/pull` - Pull members from queue(s)  
`/queues` - Manage queues  
`/schedules` - Manage scheduled commands  
`/shuffle` - Shuffle queue(s)  
`/voice` - Manage voice integrations  
`/whitelist` - Manage whitelisted users and roles

## Install & Run

| # | Instruction                                                                           | Cmd                                               |
|---|---------------------------------------------------------------------------------------|---------------------------------------------------|
| 1 | [Download Node.js](https://nodejs.org/en/download/package-manager) & restart terminal |                                                   |
| 2 | Clone Queue-Bot-2 repo                                                                | `git clone https://github.com/ArrowM/Queue-Bot-2` |
| 3 | Run setup script                                                                      | `npm run setup`                                   |
| 4 | Set **credentials** in `.env`                                                         |                                                   |
| 5 | Start the bot                                                                         | `npm run start`                                   |
