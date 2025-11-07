/* ==================================================================== */
/* Import Charadex
======================================================================= */
import { charadex } from '../charadex.js';


/* ==================================================================== */
/* Load
======================================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  await charadex.initialize.page(null, charadex.page.loggallery, null, async (listData) => {
    if (listData?.profileArray?.[0]) {
      window.charadexCurrentData = listData.profileArray[0]; // 🔥 이거 꼭 필요!
    }
  });

  charadex.tools.loadPage('.softload', 500);
});
