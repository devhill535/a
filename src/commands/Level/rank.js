// Dependencies
const { MessageAttachment } = require('discord.js'),
	{ RankSchema } = require('../../database/models'),
	{ Rank: rank } = require('canvacord'),
	Command = require('../../structures/Command.js');

module.exports = class Rank extends Command {
	constructor(bot) {
		super(bot, {
			name: 'rank',
			guildOnly: true,
			dirname: __dirname,
			aliases: ['lvl', 'level'],
			botPermissions: [ 'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES'],
			description: 'Shows your rank/Level.',
			usage: 'level [username]',
			cooldown: 3000,
			examples: ['level userID', 'level @mention', 'level username'],
		});
	}

	// Run command
	async run(bot, message) {
		// Get user
		const members = message.getMember();

		// send 'waiting' message to show bot has recieved message
		const msg = await message.channel.send(message.translate('misc:FETCHING', {
			EMOJI: message.checkEmoji() ? bot.customEmojis['loading'] : '', ITEM: this.help.name }), { tts: true });

		// Retrieve Rank from databse
		try {
			await RankSchema.findOne({
				userID: members[0].id,
				guildID: message.guild.id,
			}, (err, Xp) => {
				if (err) {
					if (bot.config.debug) bot.logger.error(`${err.message} - command: rank.`);
					return;
				}
				if (Xp == null) {
					// They haven't sent any messages yet
					msg.delete();
					message.channel.error('level/rank:NO_MESSAGES');
				} else {
					// Get rank
					RankSchema.find({
						guildID: message.guild.id,
					}).sort([
						['Xp', 'descending'],
					]).exec((err, res) => {
						if (err) console.log(err);
						let rankScore;
						for (let i = 0; i < res.length; i++) {
							if (res[i].userID == members[0].user.id) rankScore = i;
						}
						// create rank card
						const rankcard = new rank()
							.setAvatar(members[0].user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 }))
							.setCurrentXP(Xp.Level == 1 ? Xp.Xp : (Xp.Xp - (5 * ((Xp.Level - 1) ** 2) + 50 * (Xp.Level - 1) + 100)))
							.setLevel(Xp.Level)
							.setRank(rankScore + 1)
							.setRequiredXP((5 * (Xp.Level ** 2) + 50 * Xp.Level + 100) - (5 * ((Xp.Level - 1) ** 2) + 50 * (Xp.Level - 1) + 100))
							.setStatus(members[0].presence.status)
							.setProgressBar(['#FFFFFF', '#DF1414'], 'GRADIENT')
							.setUsername(members[0].user.username)
							.setDiscriminator(members[0].user.discriminator);
						// send rank card
						rankcard.build().then(buffer => {
							const attachment = new MessageAttachment(buffer, 'RankCard.png');
							msg.delete();
							message.channel.send(attachment);
						});
					});
				}
			});
		} catch (err) {
			bot.logger.error(`Command: '${this.help.name}' has error: ${err.message}.`);
			msg.delete();
			message.channel.error('misc:ERROR_MESSAGE', { ERROR: err.message }).then(m => m.delete({ timeout: 5000 }));
		}
	}
};
