module.exports = {
  packagerConfig: {
    asar: true,
    name: "Tech Command Center",
    executableName: "tech-command-center",
    ignore: [
      /^\/\.next/,
      /^\/certificates/,
      /^\/out/,
      /^\/\.env/,
    ],
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {},
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {},
    },
    {
      name: "@electron-forge/maker-deb",
      config: {},
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
  ],
};
