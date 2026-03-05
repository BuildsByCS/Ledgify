export const toPaise = (rupees) => {
  return Math.round(rupees * 100);
};

export const toRupees = (paise) => {
  return paise / 100;
};
