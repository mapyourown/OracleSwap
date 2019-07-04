import Splash from './components/pages/Splash'
import Offers from './components/pages/Offers'
import LPAsTaker from './components/pages/LP.taker'
import LPAsProvider from './components/pages/LP.provider'
import Taker from './components/pages/Taker'
import Subcontract from './components/pages/Subcontract'
import MakerHomeContainer from './layouts/LP/LPHomeContainer'
import TakerHomeContainer from './layouts/Taker/TakerHomeContainer'
import OracleHomeContainer from './layouts/Oracle/OracleHomeContainer'
import MultiOracleContainer from './layouts/Oracle/MultiOracleContainer'
import LPDetailsContainer from './layouts/LP/LPDetailsContainer'


export default [
    {path: "/", component: Splash},
    {path: "/:contract/offers", component: Offers},
    {path: "/:contract/lp/:address/taker", component: LPAsTaker},
    {path: "/:contract/lp/:address/provider", component: LPAsProvider},
    {path: "/:contract/taker/:address", component: Taker},
    {path: "/:contract/lp/:address/subcontract/:id", component: Subcontract},
    
    /* Others */
    {path: "/make", component: MakerHomeContainer},
    {path: "/lpdetails", component: LPDetailsContainer},
    {path: "/take", component: TakerHomeContainer},
    {path: "/oracle", component: OracleHomeContainer},
    {path: "/admin", component: MultiOracleContainer}
]