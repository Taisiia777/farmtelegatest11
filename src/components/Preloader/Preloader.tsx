



// import  { useEffect } from "react";
// import { Outlet } from "react-router-dom";
// import { useAppDispatch, useAppSelector } from "../../store";
// import { loadingToggle } from "../../store/reducers/preloader";
// import styles from "./Preloader.module.scss";
// import classNames from "classnames/bind";
// import logo from "../../../public/img/pages/home/pig.png"; // Путь к вашему логотипу

// const cn = classNames.bind(styles);

// const Preloader = () => {
//    const dispatch = useAppDispatch();
//    const isLodaing = useAppSelector((state) => state.preloader.isLodaing);

//    useEffect(() => {
//       setTimeout(() => {
//          dispatch(loadingToggle(false));
//       }, 5000);
//    });

//    return (
//       <>
//          {isLodaing && (
//             <div className={cn("wrap")}>
//                <div className={cn("preloader")}>
//                   <img src={logo} alt="Logo" className={cn("logo")} />
//                </div>
//             </div>
//          )}
//          <Outlet />
//       </>
//    );
// };

// export default Preloader;



import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { RootState, useAppDispatch, useAppSelector } from "../../store";
import { loadingToggle } from "../../store/reducers/preloader";
import { useQuery } from '@tanstack/react-query';
import styles from "./Preloader.module.scss";
import classNames from "classnames/bind";
import logo from "../../../public/img/pages/home/pig.png"; // Путь к вашему логотипу
import { setUser } from "../../store/reducers/userSlice";
import { retrieveLaunchParams } from '@tma.js/sdk';
import axios from "axios";

const cn = classNames.bind(styles);

interface User {
   id: number;
   username: string;
   coins: number;
   totalEarnings: number;
   incomeMultiplier: number;
   coinsPerHour: number;
   xp: number;
   level: number;
}

interface Earning {
   username: string;
   coinsEarned: number;
}

interface Friend extends User {
   coinsEarned?: number;
   secondTierEarnings?: number;
   thirdTierEarnings?: number;
}

// Функция для выполнения запроса на получение рефералов
const fetchReferralsAndEarnings = async (userId: number) => {
   console.log(userId)
  const referralsResponse = await fetch(`https://coinfarm.club/api/user/${userId}/referrals`);
  if (!referralsResponse.ok) {
    throw new Error('Failed to fetch referrals');
  }
  const referralsData = await referralsResponse.json();

  const earningsResponse = await fetch(`https://coinfarm.club/api/user/${userId}/referrals/earnings`);
  if (!earningsResponse.ok) {
    throw new Error('Failed to fetch earnings');
  }
  const earningsData = await earningsResponse.json();

  const friendsWithEarnings = await Promise.all(referralsData.map(async (friend: Friend) => {
    const earning = earningsData.find((e: Earning) => e.username === friend.username);
    

    return { ...friend, coinsEarned: earning ? earning.coinsEarned : 0};
  }));

  return friendsWithEarnings;
};

const Preloader = () => {
   const dispatch = useAppDispatch();
   const isLoading = useAppSelector((state) => state.preloader.isLodaing);
   const user = useAppSelector((state: RootState) => state.user.user);
   useEffect(() => {
      // Установить состояние загрузки в true при первом рендере
      dispatch(loadingToggle(true));
      
      // Запустить таймер на 5 секунд, после чего скрыть заставку
      const timer = setTimeout(() => {
         dispatch(loadingToggle(false));
      }, 5000);

      // Очистить таймер при размонтировании компонента
      return () => clearTimeout(timer);
   }, [dispatch]);
   useEffect(() => {
      const fetchUserData = async () => {
         const { initData } = retrieveLaunchParams();
         if (initData && initData.user) {
            const user = initData.user;
            const username = user.username;
            const userId = user.id;

            try {
               const response = await axios.get(`https://coinfarm.club/api1/getReferralCode?user_id=${userId}`);
               const data = response.data;
               let referralCode = data.referral_code;

               const userResponse = await axios.post(
                  "https://coinfarm.club/api/user",
                  {
                     username: username,
                     coins: 0,
                     totalEarnings: 0,
                     incomeMultiplier: 1,
                     coinsPerHour: 1000,
                     xp: 1000,
                     level: 0,
                     referralCode: referralCode,
                  }
               );

                  const userData = userResponse.data;
                  dispatch(setUser(userData)); // Устанавливаем уже существующего пользователя

            } catch (error) {
               console.error("Error:", error);
            }
         }
      };

      fetchUserData();
   }, [dispatch]);

   const { data: friends, isLoading: isQueryLoading, isError } = useQuery({
      queryKey: ['referrals', user?.id],
      queryFn: () => fetchReferralsAndEarnings(user.id),
      enabled: !!user?.id, // Запрос выполняется только если есть user.id
  });
  
  useEffect(() => {
      if (isQueryLoading) {
         //  dispatch(loadingToggle(true));
      } else {
         //  dispatch(loadingToggle(false));
      }
  
      if (isError) {
          console.error('Error fetching referrals and earnings');
      }
  }, [isQueryLoading, isError, dispatch]);

   useEffect(() => {
      if (isQueryLoading) {
         // dispatch(loadingToggle(true));
      }
   }, [isQueryLoading, dispatch]);

   return (
      <>
         {isLoading && (
            <div className={cn("wrap")}>
               <div className={cn("preloader")}>
                  <img src={logo} alt="Logo" className={cn("logo")} />
               </div>
            </div>
         )}
         <Outlet context={{ friends }} /> {/* Передаем загруженные данные через Outlet */}
      </>
   );
};

export default Preloader;
