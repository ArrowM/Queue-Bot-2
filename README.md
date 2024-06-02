# Queue-Bot
**Queue Bot** is a Discord bot that provides Live queues of users. Customizable. Easy to use. Built with [Discord.js](https://discord.js.org/).

[⛑️ Support](https://discord.gg/RbmfnP3)  
[🗃️ GitHub](https://github.com/ArrowM/Queue-Bot-2)  
[💖 Donate](https://www.buymeacoffee.com/Arroww)  

## Getting Started
1. [Invite the bot to your server](https://discord.com/oauth2/authorize?client_id=1246630417168076901).  
2. **Create a Queue** - create a queue by typing `/queues add`. You can create as many queues as you want.  
3. **Add Members** - members can join by clicking the 'Join' button beneath queue displays, `/join`, or by entering an integrated voice channel. Admins may also enqueue users with `/members add`.  
4. **Pull Members** - members can be pulled from a queue by admins by clicking the 'Pull' button queue displays or with `/pull`.  
5. **Explore other commands** - `/help general` explains how to join and leave queues. `/help admin` explains how admins can manage queues.

## Commands for Everyone
`/help` - get helpful info about Queue Bot  
`/join` - join a queue  
`/leave` - leave a queue  
`/positions` - get your positions in all queues  
`/show` - show queue(s)

## Admin Commands
Admin commands are restricted to users with the **Administrator** permission and users added via `/admins add`.

`/admins` - manage admin users and roles  
`/blacklist` - manage blacklisted users and roles  
`/clear` - clear a queue.
`/displays` - manage display channels  
`/members` - manage queue members  
`/move` - change the position of a queue member
`/prioritize` - manage prioritized users and roles  
`/pull` - pull members from queue(s)  
`/queues` - manage queues  
`/schedules` - manage scheduled commands  
`/shuffle` - shuffle queue(s)  
`/voice` - manage voice integrations  
`/whitelist` - manage whitelisted users and roles  

## Install & Run

### Pre-requirements
| # |                                                                                                                                                                         |
|---|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | [Invite the bot to your server](https://discord.com/oauth2/authorize?client_id=1246630417168076901)                                                                     |
| 2 | [Install Node.js](https://nodejs.org/en/download/package-manager)                                                                                                       |
| 3 | [Install Python](https://www.python.org/downloads/) (**MUST** check `Add python.exe to PATH` on first screen)                                                           |
| 3 | (**WINDOWS ONLY**)<br/>[Install MVSC](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (check the `Desktop Development with C++` tile, then click `Install`) |

Must restart terminal or device after installing pre-requirements.

### Installation
| # |                                                                                                                                                                        |                                                   |
|---|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------|
| 1 | Clone Queue-Bot-2 repo                                                                                                                                                 | `git clone https://github.com/ArrowM/Queue-Bot-2` |
| 2 | Run setup script                                                                                                                                                       | `npm run setup`                                   |
| 3 | Set **credentials** in `.env`                                                                                                                                          |                                                   |

### Running
| # |               |                 |
|---|---------------|-----------------|
| 1 | Start the bot | `npm run start` |
