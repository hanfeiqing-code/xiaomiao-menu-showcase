// 头像资源集中在这里。迁移微信小程序时，只需替换 path，不改抽取逻辑。
export const AVATARS = Object.freeze(
  Array.from({ length: 8 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return Object.freeze({
      id: `avatar-${number}`,
      path: `/avatars/avatar-${number}.jpg`,
    });
  }),
);

function browserRandomUnit() {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] / 0x100000000;
  }
  return Math.random();
}

/**
 * 八张头像被分配到随机数的八个等长区间，每张概率严格为 1/8。
 * 浏览器优先使用 32 位随机整数；2^32 可被 8 整除，不会产生取模偏差。
 * 每次抽取彼此独立，因此允许连续两次抽到同一张。
 */
export function pickRandomAvatar(random = browserRandomUnit) {
  const value = Number(random());
  const index = Math.min(AVATARS.length - 1, Math.max(0, Math.floor(value * AVATARS.length)));
  return AVATARS[index] ?? AVATARS[0];
}

export function getAvatarById(id) {
  return AVATARS.find((avatar) => avatar.id === id);
}
