import { HexColorString } from 'discord.js';

interface Config {
  prefix: string;
  color: HexColorString;
  authorIconUrl: string;
  iconUrl: string;
}

export const config: Config = {
  prefix: '!',
  color: "#130622",
  authorIconUrl: "https://avatars.githubusercontent.com/u/64919993?v=4",
  iconUrl: "https://toastdev.cc/imgs/Aircon.png",
};
