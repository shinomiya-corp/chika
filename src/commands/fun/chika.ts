import axios from "axios";
import { prisma } from "../../data/prismaClient";
import { chatbotInput, chatbotResponse } from "../../data/redisClient";
import { DEFAULT_PREFIX } from "../../shared/constants";
import { baseEmbed, sendInsufficientRibbons } from "../../shared/embeds";
import { Command, CommandCategory } from "../../types/command";
import { ChatbotInput } from "./utils/types";

const chika: Command = {
  name: "chika",
  aliases: ["ck"],
  argsCount: -2,
  category: CommandCategory.fun,
  description:
    "Chat with Chika. Be careful though, her IQ drops below 3 at times. You'll also need to pay in ribbons to chat with her, for some reason.",
  usage: `${DEFAULT_PREFIX}chat <message>`,
  async execute(message, args) {
    const { channel, author } = message;

    const generated_responses = (
      await chatbotResponse.lrange(author.id, 0, -1)
    ).reverse();
    const past_user_inputs = (
      await chatbotInput.lrange(author.id, 0, -1)
    ).reverse();
    const text = args.join(" ");

    const ribbonCost = text.length;
    const ribbonStock = await prisma.getRibbons(author);
    if (ribbonCost > ribbonStock) {
      sendInsufficientRibbons(channel, ribbonCost, ribbonStock);
      return;
    }

    const input: ChatbotInput = {
      inputs: { text, generated_responses, past_user_inputs },
    };
    const data = JSON.stringify(input);

    axios
      .post(process.env.HUGGING_FACE_API_URL, data, {
        headers: {
          Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
        },
      })
      .then((res) => {
        const reply = res.data.generated_text;
        channel.send(reply);
        chatbotInput
          .pipeline()
          .lpush(channel.id, text)
          .ltrim(channel.id, 0, 2)
          .exec();

        chatbotResponse
          .pipeline()
          .lpush(channel.id, reply)
          .ltrim(channel.id, 0, 2)
          .exec();

        prisma.decrRibbons(author, ribbonCost);
      })
      .catch((err) => {
        if (err.response?.data?.error?.includes(`is currently loading`)) {
          channel.send(
            baseEmbed().setDescription(
              `Thanks chatting with me! Please give me a minute to get ready.`
            )
          );
        }
      });
  },
};

export default chika;
