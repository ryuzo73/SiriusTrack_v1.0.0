module.exports = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
    name: '@electron-forge/maker-squirrel',
    config: {
      name: "siriustrack",
      authors: "Ryuzo <ryuzo.gary@gmail.com>",
      description: "SiriusTrack - Personal goal achievement and learning management app"
    },
  },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [],
};