This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## TLDR

1. yarn

2. Create a .env file and configure the following settings:
```
REACT_APP_PROXY=0578b8e9d9c2493d4a2e98f364c7ed311f7a0d71
REACT_APP_DATA_REFRESH_RATE=3000
REACT_APP_DASHBOARD_BLOCKCHAIN_NETWORK=https://zilliqa-isolated-server.zilliqa.com/
``` 

3. yarn dev

4. Select between Delegators and Operators

5. An operator can see "Staking Performance", "Other Staked Seed Nodes" whereas delegators can only see "Other Staked Seed Nodes"

6. Explore and execute any actions

7. If the contract details doesn't get update, click on the "Dashboard" wordings on the navigation bar to manually refresh

Note: There are might be some connection issues or bugs.


## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
