let spots = [];
let prefMap = {};

async function init() {
  spots = await fetch("spots.json").then(r => r.json());

  spots.forEach(item => {
    if (!prefMap[item.prefecture]) {
      prefMap[item.prefecture] = [];
    }
    prefMap[item.prefecture].push(item);
  });

  updateStats();
  renderPrefHoverList();

  const mapObject = document.getElementById("japan-map");

  mapObject.addEventListener("load", setupMap);

  setTimeout(setupMap, 100);
  setTimeout(setupMap, 500);
  setTimeout(setupMap, 1000);
}

function renderPrefHoverList() {
  const container =
    document.getElementById("pref-hover-list");

  const allPrefs = [
    "北海道","青森","岩手","宮城","秋田","山形","福島",
    "茨城","栃木","群馬","埼玉","千葉","東京","神奈川",
    "新潟","富山","石川","福井","山梨","長野",
    "岐阜","静岡","愛知","三重",
    "滋賀","京都","大阪","兵庫","奈良","和歌山",
    "鳥取","島根","岡山","広島","山口",
    "徳島","香川","愛媛","高知",
    "福岡","佐賀","長崎","熊本","大分","宮崎","鹿児島","沖縄"
  ];

  const rows = [];

  for (let i = 0; i < allPrefs.length; i += 2) {
    rows.push([
      allPrefs[i],
      allPrefs[i + 1] || null
    ]);
  }

  container.innerHTML = rows.map(([left, right]) => `
    <div class="pref-row">
      ${renderPrefItem(left)}
      ${right ? renderPrefItem(right) : '<div></div>'}
    </div>
  `).join("");
}

function renderPrefItem(pref) {
  const count = prefMap[pref]?.length || 0;

  return `
    <div
      class="pref-hover-item"
      data-pref="${pref}">
      ${pref} (${count}件)
    </div>
  `;
}

function isTouchDevice() {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

function setupMap() {
  const mapObject = document.getElementById("japan-map");
  const svgDoc = mapObject.contentDocument;

  if (!svgDoc) return;

  const svgRoot = svgDoc.querySelector("svg");
  if (!svgRoot) return;
  svgRoot.style.touchAction = "none";


  if (!svgDoc.getElementById("hover-style")) {
    const style = svgDoc.createElementNS(
      "http://www.w3.org/2000/svg",
      "style"
    );

    style.id = "hover-style";
    style.textContent = `
      @media (hover: hover) and (pointer: fine) {
        .prefecture.hover-linked{
          fill:#ffc107 !important;
        }
      }

      .prefecture.selected{
        stroke:#ff9800 !important;
        stroke-width:4 !important;
      }

     @media (hover: none) and (pointer: coarse) {
       .prefecture.selected{
         stroke:#ff9800 !important;
         stroke-width:5 !important;
       }
     }
    `;

    svgRoot.appendChild(style);
  }

  if (!svgRoot.dataset.dragReady) {
    svgRoot.dataset.dragReady = "true";

    let lastPointerX = 0;
    let lastPointerY = 0;
    let dragMoved = false;
    let pointerDownPref = null;

    svgRoot.addEventListener("pointerdown", e => {
      if (mapScale <= 1) return;

      dragMoved = false;
      pointerDownPref = e.target.closest(".prefecture");

      setHoverPrefecture("");
      svgDoc
        .querySelectorAll(".hover-linked")
        .forEach(el => el.classList.remove("hover-linked"));

      isDragging = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;

      svgRoot.setPointerCapture(e.pointerId);

      document
        .getElementById("japan-map")
        .classList.add("dragging");

    });

    svgRoot.addEventListener("pointermove", e => {
      if (!isDragging) return;

      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragMoved = true;
        pointerDownPref = null;
        setHoverPrefecture("");
      }

      lastPointerX = e.clientX;
      lastPointerY = e.clientY;

      mapX += dx;
      mapY += dy;

      const maxX = (mapScale - 1) * 400;
      const maxY = (mapScale - 1) * 450;

      mapX = Math.max(-maxX, Math.min(maxX, mapX));
      mapY = Math.max(-maxY, Math.min(maxY, mapY));

      updateMapTransform();

      e.preventDefault();
    });

    svgRoot.addEventListener("pointerup", e => {
      isDragging = false;

      svgRoot.releasePointerCapture(e.pointerId);

      document
        .getElementById("japan-map")
        .classList.remove("dragging");

      if (!dragMoved && pointerDownPref) {
        const prefName = pointerDownPref.dataset.name;

        selectPrefecture(pointerDownPref);
        showPrefecture(prefName);
        setSelectedPrefecture(prefName);
      }

      pointerDownPref = null;
    });

    svgRoot.addEventListener("pointercancel", () => {
      isDragging = false;

      document
        .getElementById("japan-map")
        .classList.remove("dragging");
    });
    
    svgRoot.addEventListener("pointerleave", () => {
      isDragging = false;

      document
        .getElementById("japan-map")
        .classList.remove("dragging");
    });
  }

  svgDoc
    .querySelectorAll(".prefecture")
    .forEach(pref => {
      const prefName =
        pref.dataset.name ||
        pref.querySelector("title")?.textContent.trim() ||
        "";

      pref.dataset.name = prefName;

      const count = prefMap[prefName]?.length || 0;

      const titleEl = pref.querySelector("title");
      if (titleEl) {
        titleEl.remove();
      }

      pref.onmouseenter = e => {
        if (isTouchDevice() || isDragging) return;

        pref.classList.add("hover-linked");
        setHoverPrefecture(prefName);
      };

      pref.onmousemove = null;

      pref.onmouseleave = e => {
        if (isTouchDevice()) return;

        pref.classList.remove("hover-linked");
        setHoverPrefecture("");
      };

      pref.classList.remove(
        "completed",
        "lv1",
        "lv2",
        "lv3"
      );

      if (count > 0) {
        pref.classList.add("completed");

        if (count >= 5) {
          pref.classList.add("lv3");
        } else if (count >= 3) {
          pref.classList.add("lv2");
        } else {
          pref.classList.add("lv1");
        }
      }

      pref.onclick = () => {
        selectPrefecture(pref);
        showPrefecture(prefName);
        setSelectedPrefecture(prefName);
      };
    });

  if (!svgDoc.querySelector(".selected")) {
    showWelcomePage();
  }

  document
    .querySelectorAll(".pref-hover-item")
    .forEach(item => {
      item.onmouseenter = () => {
        const targetName = item.dataset.pref;
        const svgDoc =
          document.getElementById("japan-map").contentDocument;

        setHoverPrefecture(targetName);

        svgDoc
          ?.querySelectorAll(".prefecture")
          .forEach(pref => {
            const prefName = pref.dataset.name;
            pref.classList.toggle(
              "hover-linked",
              prefName === targetName
            );
          });
      };

      item.onmouseleave = () => {
        const svgDoc =
          document.getElementById("japan-map").contentDocument;

        setHoverPrefecture("");

        svgDoc
          ?.querySelectorAll(".hover-linked")
          .forEach(pref => {
            pref.classList.remove("hover-linked");
          });
      };
      
      item.onclick = () => {
        const targetName = item.dataset.pref;
        const svgDoc =
          document.getElementById("japan-map").contentDocument;

        const targetPref =
          [...svgDoc.querySelectorAll(".prefecture")]
            .find(pref => pref.dataset.name === targetName);

        if (targetPref) {
          selectPrefecture(targetPref);
          showPrefecture(targetName);
          setSelectedPrefecture(targetName);
        }
      };

    });
}

function setHoverPrefecture(prefName) {
  document
    .querySelectorAll(".pref-hover-item")
    .forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.pref === prefName
      );
    });
}

function setSelectedPrefecture(prefName) {
  document
    .querySelectorAll(".pref-hover-item")
    .forEach(item => {
      item.classList.toggle(
        "selected",
        item.dataset.pref === prefName
      );
    });
}

function updateStats() {
  const completed = Object.keys(prefMap).length;
  const total = 47;

  const percent =
    ((completed / total) * 100).toFixed(1);

  const remaining = total - completed;

  document.getElementById("stats").textContent =
    `${completed} / ${total} 都道府県 (${percent}%) ・ 残り${remaining}都道府県`;

  document.getElementById("progress-bar").style.width =
    `${percent}%`;

  document.getElementById("total-posts").textContent =
    `総投稿数 ${spots.length}件`;
}

function selectPrefecture(pref) {
  const svgDoc =
    document.getElementById("japan-map").contentDocument;

  svgDoc
    ?.querySelectorAll(".selected")
    .forEach(el => el.classList.remove("selected"));

  pref.classList.add("selected");
}

function showWelcomePage() {

  document.getElementById("pref-name").textContent =
    "ちゅのっこ夏のおでかけマッピング2026";

  document.getElementById("post-list").innerHTML = `
    <div class="welcome">
      <h3>操作方法</h3>

      <p>
        地図から都道府県を選ぶと、<br>
        投稿されたスポットを見ることができます。
      </p>

      <h3>企画について</h3>

      <p>
        2026年の鈴日奈ちゅのさんの生誕祭に向けて、<br>
        ちゅのっこ達がちゅのグッズと共に<br>
        日本全国の名所や観光地を巡り、<br>
        47都道府県制覇を目指す企画です。
      </p>

      <p>
        募集期間：2026/06/01～2026/06/10（終了）
      </p>

      <blockquote
        class="twitter-tweet"
        data-theme="light">
        <a href="https://x.com/muiKikaku/status/2061402454848331961"></a>
      </blockquote>

    </div>
  `;

  if (window.twttr?.widgets) {
    window.twttr.widgets.load(
      document.getElementById("post-list")
    );
  }
}

function showPrefecture(prefName) {
  const posts = prefMap[prefName] || [];

  document.getElementById("pref-name").textContent =
    `${prefName} (${posts.length}件)`;

  const container =
    document.getElementById("post-list");

  if (posts.length === 0) {
    container.innerHTML =
      '<div class="empty">投稿はありません</div>';

    return;
  }

  const spotIndex = posts.map((post, index) => `
    <li>
      <a
        href="#"
        onclick="
          document.getElementById('post-${index}')
            .scrollIntoView({
              behavior:'smooth',
              block:'start'
            });
          return false;
        ">
        ${post.spot}
      </a>
    </li>
  `).join("");

  const postItems = posts.map((post, index) => `
    <div class="post" id="post-${index}">
      <h3>${post.spot}</h3>

      ${
        post.url
          ? `
            <blockquote
              class="twitter-tweet"
              data-theme="light">
              <a href="${post.url}"></a>
            </blockquote>
          `
          : `<div class="empty">投稿URLはありません</div>`
      }
    </div>
  `).join("");

  container.innerHTML = `
    <div class="spot-index">
      <div class="spot-index-title">スポット一覧</div>
      <ul>
        ${spotIndex}
      </ul>
    </div>

    ${postItems}
  `;

  if (window.twttr?.widgets) {
    window.twttr.widgets.load(container);
  }
}

let mapScale = 1;
let mapX = 0;
let mapY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

function updateMapTransform() {
  const map = document.getElementById("japan-map");

  map.style.transform =
    `translate(${mapX}px, ${mapY}px) scale(${mapScale})`;

  document.getElementById("zoom-rate").textContent =
    `${Math.round(mapScale * 100)}%`;
}

document.getElementById("zoom-in").addEventListener("click", () => {
  mapScale = Math.min(mapScale + 0.2, 2.5);
  updateMapTransform();
});

document.getElementById("zoom-out").addEventListener("click", () => {
  mapScale = Math.max(mapScale - 0.2, 1);

  if (mapScale === 1) {
    mapX = 0;
    mapY = 0;
  }

  updateMapTransform();
});

document.getElementById("zoom-reset").addEventListener("click", () => {
  mapScale = 1;
  mapX = 0;
  mapY = 0;
  updateMapTransform();
});

document
  .getElementById("show-top-page")
  ?.addEventListener("click", () => {

    const svgDoc =
      document.getElementById("japan-map")
        .contentDocument;

    svgDoc
      ?.querySelectorAll(".selected")
      .forEach(el => el.classList.remove("selected"));

    document
      .querySelectorAll(".pref-hover-item.selected")
      .forEach(el => el.classList.remove("selected"));

    showWelcomePage();
  });

init();