import dbClient from '../utils/db';

const waitConnection = () => {
  return new Promise((resolve, reject) => {
    let i = 0;
    // eslint-disable-next-line no-unused-vars
    const repeatFct = async () => {
      await setTimeout(() => {
        i += 1;
        if (i >= 10) {
          reject();
        } else if (!dbClient.isAlive()) {
          repeatFct();
        } else {
          resolve();
        }
      }, 1000);
    };
  });
};

(async () => {
  console.log(dbClient.isAlive());
  await waitConnection();
  console.log(dbClient.isAlive());
})();
