/* ==================================================================== */
/* Import Charadex
======================================================================= */
import { charadex } from '../charadex.js';


/* ==================================================================== */
/* Load
======================================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    await charadex.initialize.page(null, charadex.page.loggallery, null, async (ret) => {
      if (ret?.profileArray?.[0]) window.charadexCurrentData = ret.profileArray[0];
    });

  charadex.tools.loadPage('.softload', 500);
});
