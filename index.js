// 'use strict'
import axios from 'axios';
const defaultTimeout = 2000;

export function moveSkeleton(id, timeout) {
  let isHasMove = false;
  let requestCount = 0;
  let responseCount = 0;


  const clock = setTimeout(() => {
    const skeleton = document.getElementById(id);
    if(skeleton) document.body.removeChild(skeleton);
    isHasMove = true;
  }, timeout || defaultTimeout)

  axios.interceptors.request.use(request => {
    if(responseCount === 0) { // 在第一个响应到来之前，计算请求总数
      requestCount++;
    }
    return request;
  });
  axios.interceptors.response.use(response => {
    responseCount++;
    if(requestCount === responseCount && !isHasMove) {
      clearTimeout(clock)
      setTimeout(() => {
        const skeleton = document.getElementById(id);
        if(skeleton) document.body.removeChild(skeleton);
      }, 0);
    }
    return response;
  });
}
