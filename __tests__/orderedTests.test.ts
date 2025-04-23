import notLogged from "./tests/1_notLogged"
import registration from "./tests/2_registration"
import login from "./tests/3_login"
import logout from "./tests/4_logout";
import homepage from "./tests/5_homepage";
import users from "./tests/6_users";
import resources from "./tests/7_resources"
import reservations from "./tests/8_reservations"
import cleanup from "./tests/cleanup";
import adminOnly from "./tests/9_adminOnly";

describe('Integration test', () => {
    notLogged()
    registration()
    login()
    logout()
    homepage()
    users()
    resources()
    reservations()
    adminOnly()
    cleanup()
})