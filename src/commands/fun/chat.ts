import axios from "axios";
import { PREFIX } from "../../constants";
import { baseEmbed } from "../../shared/embeds";
import { Command } from "../../types/command";
import { ChatbotInput } from "./utils/types";

const chat: Command = {
  name: "chat",
  argsCount: -2,
  category: "Fun",
  description:
    "Chat with Chika. Be careful though, her IQ drops below 3 at times.",
  usage: `${PREFIX}chat <message>`,
  async execute(
    message,
    args,
    { chatbotInputRedis: inputRedis, chatbotResponseRedis: responseRedis }
  ) {
    const { channel, author } = message;

    const generated_responses = (
      await responseRedis.lrange(author.id, 0, -1)
    ).reverse();
    const past_user_inputs = (
      await inputRedis.lrange(author.id, 0, -1)
    ).reverse();
    const text = args.join(" ");
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
        inputRedis
          .lpush(author.id, text)
          .then(() => inputRedis.ltrim(author.id, 0, 2));

        responseRedis
          .lpush(author.id, reply)
          .then(() => responseRedis.ltrim(author.id, 0, 2));
      })
      .catch((err) => {
        if (err.response?.data?.error?.includes(`is currently loading`)) {
          channel.send(
            baseEmbed().setDescription(
              `Thanks for wanting to chat with me! Please give me about ${Math.round(
                err.response.data.estimated_time
              )} seconds to get ready.`
            )
          );
        }
      });
  },
};

export default chat;
