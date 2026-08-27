import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Client, GatewayIntentBits, Partials, Events, EmbedBuilder, PermissionsBitField, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { db } from "./src/db";
import { skulls } from "./src/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

const PORT = 3000;

const activeSyncs = new Set<string>();

async function updateSkullCount(guildId: string, userId: string, username: string, change: number) {
  const existingRecord = await db.select().from(skulls).where(and(eq(skulls.guildId, guildId), eq(skulls.userId, userId))).limit(1);

  if (existingRecord.length > 0) {
    const newCount = Math.max(0, existingRecord[0].count + change);
    await db.update(skulls)
      .set({ count: newCount, username })
      .where(and(eq(skulls.guildId, guildId), eq(skulls.userId, userId)));
  } else {
    await db.insert(skulls).values({
      id: `${guildId}-${userId}`,
      guildId,
      userId,
      username,
      count: Math.max(0, change),
    });
  }
}

// --- Discord Bot Setup ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Discord bot logged in as ${readyClient.user.tag}`);
});

// Listen for reactions being added
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;

  // When a reaction is received, check if the structure is partial
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Something went wrong when fetching the reaction:", error);
      return;
    }
  }

  // U+1F480 is the standard skull emoji: 💀
  if (reaction.emoji.name === "💀") {
    const author = reaction.message.author;
    const guildId = reaction.message.guildId;
    if (author && !author.bot && guildId) {
      // Add a skull point to the author of the message
      await updateSkullCount(guildId, author.id, author.username, 1);
    }
  }
});

// Listen for reactions being removed
client.on(Events.MessageReactionRemove, async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Something went wrong when fetching the reaction:", error);
      return;
    }
  }

  if (reaction.emoji.name === "💀") {
    const author = reaction.message.author;
    const guildId = reaction.message.guildId;
    if (author && !author.bot && guildId) {
      await updateSkullCount(guildId, author.id, author.username, -1);
    }
  }
});

async function getLeaderboardMessage(guildId: string, guildName: string, page: number) {
  const allUsers = await db.select().from(skulls).where(and(eq(skulls.guildId, guildId), sql`${skulls.count} > 0`)).orderBy(desc(skulls.count));

  if (allUsers.length === 0) {
    return { content: "The skull board is currently empty. React with 💀 to start it!" };
  }

  const itemsPerPage = 10;
  const totalPages = Math.ceil(allUsers.length / itemsPerPage) || 1;
  
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const startIndex = (page - 1) * itemsPerPage;
  const pageUsers = allUsers.slice(startIndex, startIndex + itemsPerPage);

  const description = pageUsers.map((data, index) => {
    const rank = startIndex + index + 1;
    let rankDisplay = `${rank}.`;
    if (rank === 1) rankDisplay = "🥇";
    if (rank === 2) rankDisplay = "🥈";
    if (rank === 3) rankDisplay = "🥉";
    return `${rankDisplay} **${data.username}** — ${data.count} 💀`;
  }).join("\n");

  const embed = new EmbedBuilder()
    .setTitle(`💀 Skull Board - ${guildName} 💀`)
    .setColor("#2b2d31")
    .setDescription(description)
    .setFooter({ text: `Page ${page} of ${totalPages} | React with 💀 to boost someone's score!` });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`skulls_page_${page - 1}`)
      .setLabel("◀ Previous")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 1),
    new ButtonBuilder()
      .setCustomId(`skulls_page_${page + 1}`)
      .setLabel("Next ▶")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === totalPages)
  );

  return { embeds: [embed], components: [row] };
}

// Handle Button Interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.guildId) return;

  if (interaction.customId.startsWith("skulls_page_")) {
    const page = parseInt(interaction.customId.replace("skulls_page_", ""), 10);
    const messagePayload = await getLeaderboardMessage(interaction.guildId, interaction.guild?.name || "Server", page);
    await interaction.update(messagePayload as any);
  }
});

// Leaderboard Command
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === "!skulls" || message.content.toLowerCase() === "!skullboard") {
    if (!message.guildId) return;
    
    const messagePayload = await getLeaderboardMessage(message.guildId, message.guild?.name || "Server", 1);
    
    if ("content" in messagePayload) {
       message.reply({ content: messagePayload.content as string });
    } else {
       message.reply(messagePayload as any);
    }
  }

  // Personal Skulls Command
  if (message.content.toLowerCase() === "!myskulls") {
    if (!message.guildId) return;
    
    const userId = message.author.id;
    const userRecord = await db.select().from(skulls).where(and(eq(skulls.guildId, message.guildId), eq(skulls.userId, userId))).limit(1);
    const userSkulls = userRecord.length > 0 ? userRecord[0].count : 0;
    
    const allUsers = await db.select().from(skulls).where(and(eq(skulls.guildId, message.guildId), sql`${skulls.count} > 0`)).orderBy(desc(skulls.count));
      
    const rankIndex = allUsers.findIndex((u) => u.userId === userId);
    const rankText = rankIndex !== -1 ? `#${rankIndex + 1}` : "Unranked";

    const embed = new EmbedBuilder()
      .setColor("#00FF41")
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setDescription(`You have collected **${userSkulls}** 💀`)
      .addFields(
        { name: "Server Rank", value: rankText, inline: true }
      );

    message.reply({ embeds: [embed] });
  }

  // Sync Skulls Command (Admin only)
  if (message.content.toLowerCase() === "!syncskulls") {
    if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
      message.reply("You need Administrator permissions to run this command.");
      return;
    }

    const guild = message.guild;
    if (!guild) return;

    if (activeSyncs.has(guild.id)) {
      message.reply("⏳ A deep scan is already in progress for this server. Please wait for it to finish.");
      return;
    }

    activeSyncs.add(guild.id);

    try {
      await message.reply("🔍 Beginning deep scan of server history for skulls... This will reset current counts and rebuild them from scratch. This might take several minutes depending on server size.");
      
      // Reset DB to prevent double counting
      await db.delete(skulls).where(eq(skulls.guildId, guild.id));

      let totalScanned = 0;
      let totalSkulls = 0;

      const channels = guild.channels.cache.filter(c => c.isTextBased());

      for (const [_, channel] of channels) {
        // Ensure the bot has permission to view the channel and read history before fetching
        const botMember = guild.members.me;
        if (botMember) {
          const permissions = (channel as TextChannel).permissionsFor(botMember);
          if (!permissions || !permissions.has(PermissionsBitField.Flags.ViewChannel) || !permissions.has(PermissionsBitField.Flags.ReadMessageHistory)) {
            continue; // Skip this channel to avoid Missing Access errors
          }
        }

        try {
          let lastId: string | undefined = undefined;
          let keepFetching = true;

          while (keepFetching) {
            const options: { limit: number; before?: string } = { limit: 100 };
            if (lastId) options.before = lastId;

            const messages = await (channel as TextChannel).messages.fetch(options);
            if (messages.size === 0) {
              keepFetching = false;
              break;
            }

            for (const [msgId, msg] of messages) {
              totalScanned++;
              if (msg.author.bot) continue;

              const skullReaction = msg.reactions.cache.find(r => r.emoji.name === "💀");
              if (skullReaction) {
                const count = skullReaction.count;
                totalSkulls += count;
                
                await updateSkullCount(guild.id, msg.author.id, msg.author.username, count);
              }
            }

            lastId = messages.last()?.id;
            
            // Small delay to prevent rate limits on huge servers
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (err) {
          console.error(`Could not fetch messages for channel ${channel.name}`, err);
        }
      }

      message.channel.send(`✅ Deep scan complete! Scanned **${totalScanned}** messages and found **${totalSkulls}** skulls. Type \`!skulls\` to see the updated board.`);
    } finally {
      activeSyncs.delete(guild.id);
    }
  }
});

// Start Bot
if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN).catch((err) => {
    console.error("Failed to login to Discord:", err.message);
  });
}

// --- Express App Setup ---
async function startServer() {
  const app = express();

  // API Routes
  app.get("/api/status", (req, res) => {
    const isBotOnline = client.isReady();
    res.json({
      status: isBotOnline ? "online" : "offline",
      botName: client.user?.tag || null,
      guildCount: client.guilds.cache.size || 0,
      hasToken: !!process.env.DISCORD_TOKEN,
    });
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const allSkulls = await db.select().from(skulls);
      
      const globalStats: Record<string, { username: string; count: number }> = {};
      
      for (const record of allSkulls) {
        if (!globalStats[record.userId]) {
          globalStats[record.userId] = { username: record.username, count: 0 };
        }
        globalStats[record.userId].count += record.count;
      }
      
      const sortedUsers = Object.entries(globalStats)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count);
        
      res.json(sortedUsers);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      res.status(500).json({ error: "Failed to fetch leaderboard", details: err instanceof Error ? err.message : String(err) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
