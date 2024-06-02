# Queue-Bot
**Queue Bot** provides live queues of users. Customizable. Easy to use.

[⛑️ Support]https://discord.gg/RbmfnP3
[🗃️ GitHub Repository️]https://github.com/ArrowM/Queue-Bot-2
[💖 Donate]https://www.buymeacoffee.com/Arroww

## Getting Started
1. [Invite the bot to your server](https://discord.com/oauth2/authorize?client_id=721401878654484630).  
2. **Create a Queue** - create a queue by typing `/queues add`. You can create as many queues as you want.  
3. **Add Members** - members can join by clicking the 'Join' button beneath queue displays, `/join`, or by entering an integrated voice channel. Admins may also enqueue users with `/members add`.  
4. **Pull Members** - members can be pulled from a queue by admins by clicking the 'Pull' button queue displays or with `/pull`.  
5. **Explore other commands** - `/help general` explains how to join and leave queues. `/help admin` explains how admins can manage queues.

## Commands
Most commands will be hidden until you have at least one queue.

### Commands for Everyone
`/help` - get helpful info about Queue Bot  
`/join` - join a queue  
`/leave` - leave a queue  
`/positions` - get your positions in all queues  
`/show` - show queue(s)

### Admin Commands
Admin commands are restricted to server admins and users added via `/admins add`.

`/admins` - manage admin users and roles  
`/blacklist` - manage blacklisted users and roles  
`/clear` - clear a queue. (shortcut for `/members delete ALL`)  
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

| # | Instruction                                                                           | Cmd                                               |
|---|---------------------------------------------------------------------------------------|---------------------------------------------------|
| 1 | [Download Node.js](https://nodejs.org/en/download/package-manager) & restart terminal |                                                   |
| 2 | Clone Queue-Bot-2 repo                                                                | `git clone https://github.com/ArrowM/Queue-Bot-2` |
| 3 | Run setup script                                                                      | `npm run setup`                                   |
| 4 | Set **credentials** in `.env`                                                         |                                                   |
| 5 | Start the bot                                                                         | `npm run start`                                   |
