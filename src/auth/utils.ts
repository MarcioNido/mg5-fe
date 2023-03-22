import axios from '../utils/axios';
import {api} from "../common/apis/configs/axiosConfig";

export const setSession = (accessToken: string | null) => {

  if (accessToken) {

    localStorage.setItem('accessToken', accessToken);
    axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

  } else {

    localStorage.removeItem('accessToken');
    delete axios.defaults.headers.common.Authorization;
    delete api.defaults.headers.common.Authorization;

  }

};
