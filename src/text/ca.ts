/**
 * ───────────────────────────────────────────────────────────────────────────
 *  TOT EL TEXT DE LA INTERFÍCIE (català)
 * ───────────────────────────────────────────────────────────────────────────
 *  Aquest és l'ÚNIC fitxer que cal tocar per editar qualsevol text visible de
 *  l'app, o per traduir-la a un altre idioma (duplica el fitxer i tradueix).
 *
 *  Convencions:
 *   - Text fix → string normal.
 *   - Text amb variables o plurals → funció tipada: (n) => `...${n}...`.
 *   - Mapes d'etiquetes d'enums → objectes (food: 'Menjar', ...).
 *  Organitzat per àrea/pantalla. Mantingues l'ordre i els accents tal qual.
 */
export const ca = {
  /** Nom de l'app. */
  appName: "Tossut",

  /** Reutilitzats arreu. */
  common: {
    save: "Desar",
    cancel: "Cancel·lar",
    delete: "Eliminar",
    close: "Tancar",
    seeArrow: "Veure →",
    loading: "Carregant…",
    search: "Cercar…",
    expiredShort: "caducat",
    daysShort: (n: number) => `${Math.ceil(n)} d`,
  },

  /** Visor d'imatge a pantalla completa. */
  viewer: {
    label: "Imatge a pantalla completa",
  },

  /** Navegació inferior i capçalera. */
  nav: {
    home: "Inici",
    locations: "Llocs",
    objects: "Objectes",
    recipes: "Receptes",
    checklists: "Checklists",
    settingsAria: "Ajustos",
    settings: "Ajustos",
    history: "Historial",
    more: "Més",
    offlineBanner: (n: number) =>
      `Sense connexió · ${n} ${n === 1 ? "canvi pendent" : "canvis pendents"} de sincronitzar`,
  },

  /** Login. */
  login: {
    yourName: "El teu nom",
    namePlaceholder: "p.ex. Aimar",
    boatPassword: "Contrasenya del vaixell",
    passwordPlaceholderConfigured: "••••••",
    passwordPlaceholderLocal: "(no cal en mode local)",
    entering: "Entrant…",
    enter: "Entrar",
    localModeHint:
      "Mode local: encara no s'ha configurat el núvol. Pots treballar offline; la sincronització s'activarà quan es configuri Supabase.",
    emptyName: "Cal escriure un nom.",
    wrongPassword: "Contrasenya del vaixell incorrecta.",
  },

  /** Estat de sincronització (indicador i ajustos). */
  sync: {
    syncing: "Sincronitzant…",
    offline: "Sense connexió",
    error: "Error de sync",
    localMode: "Mode local",
    syncedRel: (rel: string) => `Sincronitzat ${rel}`,
    neverSynced: "Sense sincronitzar",
    syncNowAria: "Toca per sincronitzar ara",
  },

  /** Portada / dashboard. */
  home: {
    cook: "Cuinar",
    buy: "Comprar",
    guide: "Guia",
    measure: "Mesura",
    faults: "Avaries",
    documents: "Documentació",
    estimatedDuration: "Durada estimada",
    noConsumption: "sense consum",
    expiringSoon: "Caduca aviat",
    seeAll: "veure tot →",
    nothingExpires7: "Res caduca en 7 dies.",
    drinkingWater: "Aigua potable",
    noWaterObjects: "Cap objecte d'aigua definit.",
    litersPerBottle: (l: number) => `${l} L / ampolla`,
    /** Títol de la targeta dels recursos continus. */
    resourcesCard: "Gasoil, Aigua i Gas",
  },

  /** Menú cuinar. */
  cook: {
    whatToCook: "Què cuinem?",
    recipe: "Recepta",
    drink: "Begudes",
    snacks: "Picar",
    dessert: "Postre",
    breakfast: "Esmorzar",
    all: "Tot",
    back: "← Tornar",
    searchObject: "Cercar objecte…",
    /** Títols de cada submode. */
    titles: {
      recipe: "Receptes",
      drink: "Begudes",
      snacks: "Per picar",
      dessert: "Postres i fruita",
      breakfast: "Esmorzar",
      all: "Tots els objectes",
    } as Record<string, string>,
    noRecipes: "Encara no hi ha receptes. Crea'n una a Receptes.",
    noObjectsIn: (title: string) => `No hi ha objectes a "${title}".`,
  },

  /** Panell de cuinar una recepta. */
  cookPanel: {
    diners: "Comensals",
    have: (qty: string) => `(hi ha ${qty})`,
    shortWarning: "Falta estoc d'alguns ingredients (en vermell).",
    confirmShort:
      "Falta estoc d'alguns ingredients. Si cuines igualment, el seu estoc quedarà a 0. Continuar?",
    cook: "Cuinar",
  },

  /** Menú de selecció del recurs a mesurar. */
  measureMenu: {
    title: "De què vols prendre mesura?",
    back: "← Tornar",
  },

  /** Recursos continus: gasoil, aigua de tancs, gas. */
  resources: {
    /** Noms de cada recurs. */
    kind: {
      fuel: "Gasoil",
      water: "Aigua",
      gas: "Gas",
    } as Record<string, string>,
    /** Noms dels tancs d'aigua. */
    tank: {
      proa: "Proa",
      popa: "Popa",
    } as Record<string, string>,
    noConsumption: "sense estimació",
    daysRemaining: (n: number) => `~${Math.floor(n)} d`,
    notMeasured: "sense mesura",

    // — accions —
    addMeasure: "Afegir mesura",
    toggleMeasure: "Nova mesura",
    fill: "Omplir",
    full: "PLE",
    liters: "Litres",
    save: "Desar",
    cancel: "Cancel·lar",

    // — gasoil —
    fuelLevel: "Nivell (%)",
    fuelLitersOf: (liters: number, cap: number) => `${Math.round(liters)} / ${cap} L`,
    fuelCapacity: "Capacitat del tanc (L)",

    // — aigua —
    activeTank: "Tanc obert",
    selectActiveTank: "Quin tanc està obert?",
    counter: "Comptador",
    counterReading: "Lectura del comptador",
    switchTankNeedsCounter: "En canviar de tanc cal indicar la lectura actual del comptador.",
    fillTank: (tank: string) => `Omplir ${tank}`,
    tankLitersOf: (liters: number, cap: number) => `${Math.round(liters)} / ${cap} L`,
    waterTotal: "Total",
    proaCapacity: "Capacitat Proa (L)",
    popaCapacity: "Capacitat Popa (L)",

    // — gas —
    gasWeight: "Pes de la bombona (kg)",
    gasWeightOf: (kg: number) => `${Math.round(kg * 100) / 100} kg`,
    swapBottle: "Canviar bombona",
    swapBottleConfirm: "Canviar per una bombona plena? El pes tornarà a ple.",
    gasFullKg: "Pes ple (kg)",
    gasEmptyKg: "Pes buit (kg)",

    // — config —
    settings: "Configuració",
    settingsSaved: "Configuració desada.",

    // — historial de mesures —
    historyTitle: "Historial de mesures",
    historyEmpty: "Encara no hi ha mesures.",
    /** Descripció curta de cada tipus d'event a l'historial. */
    event: {
      fuelMeasure: (p: number) => `Mesura: ${Math.round(p)}%`,
      fuelRefillFull: "Omplert: PLE",
      fuelRefillLiters: (l: number) => `Omplert: +${l} L`,
      waterMeasure: (counter: number, tank: string) => `Comptador ${counter} · ${tank}`,
      waterRefillFull: (tank: string) => `Omplert ${tank}: PLE`,
      waterRefillLiters: (tank: string, l: number) => `Omplert ${tank}: +${l} L`,
      gasMeasure: (kg: number) => `Pes: ${Math.round(kg * 100) / 100} kg`,
      gasSwap: "Bombona canviada",
      config: "Configuració actualitzada",
    },
  },

  /** Avaries del vaixell. */
  faults: {
    title: "Avaries",
    empty: "Cap avaria activa.",
    report: "Reportar avaria",
    /** Etiquetes de gravetat. */
    severity: {
      yellow: "Lleu",
      orange: "Moderada",
      red: "Greu",
    } as Record<string, string>,
    severityQuestion: "Gravetat",
    titleLabel: "Títol",
    titlePlaceholder: "p.ex. Fuita al motor",
    descriptionLabel: "Descripció",
    descriptionPlaceholder: "Detalls de l'avaria…",
    reportedBy: (who: string) => `Reportada per ${who}`,
    updates: "Actualitzacions",
    noUpdates: "Cap actualització encara.",
    addUpdate: "Afegir actualització",
    updatePlaceholder: "Què ha passat o què s'ha fet…",
    addPhoto: "Afegir foto",
    discardPhoto: "Sortir",
    processing: "Processant…",
    updatePhotoAlt: "Foto de l'actualització",
    photoUpdate: "Foto",
    resolve: "Solucionar",
    resolveConfirm: "Marcar aquesta avaria com a solucionada? Sortirà de la llista (quedarà a l'historial).",
    updateBy: (who: string) => `per ${who}`,
    viewHistory: "Historial d'avaries",
    saveUpdate: "Desar",
    // — historial —
    historyTitle: "Historial d'avaries",
    historyEmpty: "Cap event d'avaria encara.",
    /** Etiquetes dels tipus d'event a l'historial. */
    eventKind: {
      report: "Reportada",
      update: "Actualització",
      resolve: "Solucionada",
      reopen: "Reoberta",
    } as Record<string, string>,
    eventCount: (n: number) => (n === 1 ? "1 event" : `${n} events`),
    resolvedBadge: "solucionada",
    reopen: "Reobrir avaria",
    reopenConfirm: "Reobrir aquesta avaria? Tornarà a la llista d'avaries actives.",
    resetAll: "Esborrar l'historial d'avaries",
    resetConfirm:
      "S'esborrarà TOT l'historial d'avaries (reports, actualitzacions i resolucions) a tots els dispositius. Aquesta acció no es pot desfer. Continuar?",
    resetEntryTitle: "Historial reiniciat",
    activeCount: (n: number) => (n === 1 ? "1 avaria activa" : `${n} avaries actives`),
  },

  /** Documentació tècnica del veler. */
  documents: {
    title: "Documentació",
    newDocument: "Nou document",
    empty: "Encara no hi ha documents.",
    emptyCategory: "Cap document en aquesta categoria.",
    noResults: "Cap document coincideix amb la cerca.",
    backToCategories: "← Categories",
    /** Etiquetes de categoria. */
    category: {
      inspection: "Inspecció tècnica",
      homologation: "Homologacions",
      safety: "Material de seguretat",
      license: "Títols",
      registration: "Abanderament",
      customs: "Duanes",
      insurance: "Assegurança",
      other: "Altres",
    } as Record<string, string>,
    categoryLabel: "Categoria",
    docCount: (n: number) => (n === 1 ? "1 document" : `${n} documents`),
    eventCount: (n: number) => (n === 1 ? "1 event" : `${n} events`),
    expiringBadge: (n: number) => (n === 1 ? "1 caduca aviat" : `${n} caduquen aviat`),
    // — ordenació —
    sortLabel: "Ordenar per",
    sort: {
      expiry: "Validesa",
      title: "Títol",
      category: "Categoria",
    } as Record<string, string>,
    // — caducitat —
    expiresIn: (n: number) => `caduca en ${Math.ceil(n)} d`,
    expiresInMonths: (m: number) => `caduca en ${m} ${m === 1 ? "mes" : "mesos"}`,
    expiresToday: "caduca avui",
    expired: "caducat",
    noExpiry: "sense caducitat",
    validUntil: (date: string) => `Validesa: ${date}`,
    // — camps del formulari —
    titleLabel: "Títol",
    titlePlaceholder: "p.ex. Certificat d'abanderament",
    descriptionLabel: "Descripció",
    descriptionPlaceholder: "Detalls del document…",
    validUntilLabel: "Data de validesa",
    issuedAtLabel: "Data d'emissió",
    referenceLabel: "Número / referència",
    referencePlaceholder: "p.ex. ES-12345",
    issuerLabel: "Entitat emissora",
    issuerPlaceholder: "p.ex. Capitania Marítima",
    physicalLocationLabel: "On és l'original",
    physicalLocationPlaceholder: "p.ex. Carpeta blava, taula de cartes",
    fileLabel: "Fitxer digital",
    addFile: "Adjuntar fitxer (PDF o imatge)",
    changeFile: "Canviar fitxer",
    fileAttached: "Fitxer adjuntat",
    processing: "Processant…",
    // — accions de la targeta —
    viewFile: "Veure document",
    noFile: "Sense fitxer digital",
    edit: "Editar",
    renew: "Renovar",
    renewTitle: "Renovar document",
    renewHint: "Adjunta el nou document i indica la nova validesa. L'anterior quedarà a l'historial.",
    delete: "Eliminar document",
    deleteConfirm:
      "Eliminar aquest document? Sortirà de la llista però quedarà a l'historial.",
    previousVersions: "Versions anteriors",
    previousVersionsTitle: "Versions anteriors",
    noPreviousVersions: "Aquest document no s'ha renovat mai.",
    versions: "Versions",
    versionLabel: (n: number) => (n === 0 ? "Original" : `Renovació ${n}`),
    currentVersion: "Versió vigent",
    renewedOn: (date: string) => `Renovat el ${date}`,
    // — comentaris —
    comments: "Comentaris",
    noComments: "Cap comentari.",
    addComment: "Afegir comentari",
    commentPlaceholder: "Anotació sobre el document…",
    addPhoto: "Afegir foto",
    discardPhoto: "Sortir",
    photoComment: "Foto",
    commentPhotoAlt: "Foto del comentari",
    deleteComment: "Eliminar",
    deleteCommentConfirm: "Eliminar aquest comentari? Deixarà de mostrar-se (quedarà a l'historial).",
    saveComment: "Desar",
    commentBy: (who: string) => `per ${who}`,
    createdBy: (who: string) => `Creat per ${who}`,
    // — historial general —
    viewHistory: "Historial de documents",
    historyTitle: "Historial de documents",
    historyEmpty: "Cap event de document encara.",
    deletedBadge: "eliminat",
    restore: "Reinstaurar",
    restoreConfirm: "Reinstaurar aquest document? Tornarà a la llista de documents actius.",
    /** Etiquetes dels tipus d'event a l'historial. */
    eventKind: {
      create: "Creat",
      edit: "Editat",
      renew: "Renovat",
      comment: "Comentari",
      comment_delete: "Comentari eliminat",
      delete: "Eliminat",
      restore: "Reinstaurat",
    } as Record<string, string>,
    resetAll: "Esborrar l'historial de documents",
    resetConfirm:
      "S'esborrarà TOT l'historial de documents (creacions, edicions, renovacions, comentaris i eliminacions) a tots els dispositius. Aquesta acció no es pot desfer. Continuar?",
    resetEntryTitle: "Historial reiniciat",
    save: "Desar",
  },

  /** Guia del vaixell (manual per a la tripulació). */
  guide: {
    title: "Guia del vaixell",
    intro: "Dubtes habituals a bord. Toca un tema per saltar-hi.",
    indexTitle: "Temes",
    empty: "Encara no hi ha temes a la guia.",
  },

  /** Consum ràpid. */
  quickConsume: {
    spendTitle: (name: string) => `Gastar ${name}`,
    inStockLabel: (qty: string) => `En estoc: ${qty}`,
    confirmConsume: "Confirmar consum",
  },

  /** Mode compra. */
  purchase: {
    title: "Mode compra",
    addedCount: (n: number) => `${n} afegits`,
    ingredient: "Ingredient",
    recipe: "Recepta",
    finish: "Acabar compra",
    backToMenu: "← Menú compra",
    addIngredient: "Afegir ingredient",
    noObjects: "Cap objecte. Crea'n a la pestanya Objectes.",
    addRecipe: "Afegir recepta",
    noRecipes: "Cap recepta.",
    ingredientsCount: (n: number) => `${n} ingr.`,
    addObjectTitle: (name: string) => `Afegir ${name}`,
    expiryDate: "Data de caducitat",
    addToStock: "Afegir a l'estoc",
    howManyPeople: "Per a quantes persones?",
    addIngredients: "Afegir ingredients",
  },

  /** Llista de la compra. */
  shopping: {
    openList: "Llista de la compra",
    title: "Llista de la compra",
    searchPlaceholder: "Cerca un objecte per afegir…",
    noResults: "Cap objecte. Crea'n a la pestanya Objectes.",
    empty: "La llista és buida. Cerca un objecte per afegir-l'hi.",
    addToListTitle: (name: string) => `Afegir a la llista: ${name}`,
    addToList: "Afegir a la llista",
    inList: "A la llista",
    remove: "Eliminar",
    bought: "Comprat!",
    expiryDate: "Data de caducitat",
    clearAll: "Buidar la llista",
    clearConfirm:
      "Es trauran TOTS els elements de la llista de la compra. Continuar?",
    history: "Historial",
    historyTitle: "Historial de la compra",
    historyEmpty: "Cap moviment a la llista encara.",
    clearedEntryTitle: "Llista buidada",
    showCleared: (n: number) => (n === 1 ? "1 element" : `${n} elements`),
    eventKind: {
      add: "Afegit",
      bought: "Comprat",
      remove: "Eliminat",
    } as Record<string, string>,
  },

  /** Catàleg d'objectes. */
  objects: {
    title: "Objectes",
    toRecipes: "Receptes →",
    empty: "Cap objecte. Crea'n un amb el botó de sota.",
    newObject: "+ Nou objecte",
    newObjectTitle: "Nou objecte",
    editObjectTitle: "Editar objecte",
    confirmDelete: (name: string) =>
      `Eliminar "${name}"? Es traurà també de les receptes on figuri com a ingredient.`,
  },

  /** Detall d'un objecte i etiquetes d'objecte reutilitzables. */
  object: {
    spend: "Gastar",
    spendTitle: (name: string) => `Gastar ${name}`,
    inStock: "En estoc",
    inStockLabel: (qty: string) => `En estoc: ${qty}`,
    capacity: "Capacitat",
    tracking: "Seguiment",
    durationOn: "Durada activada",
    storedAt: "On es guarda",
    expiryByLots: "Caducitat (per lots)",
    expired: "caducat",
    daysLeft: (n: number) => `${Math.ceil(n)} dies`,
    recipesWithIngredient: "Receptes amb aquest ingredient",
    noRecipeUses: "Cap recepta l'utilitza encara.",
    adjustStock: "Ajustar estoc",
    editObject: "Editar objecte",
    confirmConsume: "Confirmar consum",
    /** Etiquetes de `stockType`. */
    stockType: {
      food: "Menjar",
      consumable: "Fungible",
      tools: "Eines",
      other: "Altres",
    },
    /** Etiquetes de `foodCategory`. */
    foodCategory: {
      fridge: "Nevera",
      snacks: "Per picar",
      canned: "Conserves",
      fruit: "Fruita",
      vegetables: "Verdures",
      breakfast: "Esmorzar",
      dessert: "Postres",
      water: "Aigua",
      drink: "Beguda",
      other: "Altres",
    } as Record<string, string>,
  },

  /** Formulari d'objecte. */
  objectForm: {
    name: "Nom",
    icon: "Icona",
    type: "Tipus",
    quantityUnit: "Unitat de quantitat",
    units: "Unitats",
    kg: "Quilos (kg)",
    liters: "Litres (L)",
    foodCategory: "Categoria de menjar",
    bottleCapacity: "Capacitat de l'ampolla (litres)",
    bottleCapacityPlaceholder: "p.ex. 8, 5, 1.5",
    waterHint:
      "L'aigua es compta en ampolles. La durada al dashboard es calcula sumant els litres de tota l'aigua potable.",
    expiry: "Caducitat",
    expiryNever: "No caduca",
    expiryDaysFromPurchase: "Dies des de la compra",
    expiryDefineOnAdd: "Definir en afegir",
    daysPlaceholder: "Dies",
    trackDuration: "Mostrar estimació de durada (gas, cafè…)",
    usualLocations: "Llocs habituals",
    /** Etiquetes de `stockType` per al desplegable (accés per clau literal). */
    stockTypeOptions: {
      food: "Menjar",
      consumable: "Fungible",
      tools: "Eines",
      other: "Altres",
    },
    /** Etiquetes de `foodCategory` per al desplegable (accés per clau literal). */
    foodCategoryOptions: {
      fridge: "Nevera",
      snacks: "Per picar",
      canned: "Conserves",
      fruit: "Fruita",
      vegetables: "Verdures",
      breakfast: "Esmorzar",
      dessert: "Postres",
      water: "Aigua",
      drink: "Beguda",
      other: "Altres",
    },
  },

  /** Selector d'icona. */
  iconPicker: {
    searchPlaceholder: "Cerca una icona (poma, peix, clau…)",
    removeIconAria: "Treure icona",
    noIcons: "Cap icona trobada.",
    loading: "Carregant icones…",
    refineSearch: "Afina la cerca per veure’n més",
  },

  /** Llocs d'estiva. */
  locations: {
    title: "Llocs d'estiva",
    processing: "Processant…",
    changePhoto: "Canviar foto",
    addPhoto: "Afegir foto",
    headerAlt: "Estiva del vaixell",
    empty: "Cap lloc definit encara.",
    newLocation: "+ Nou lloc",
    newLocationTitle: "Nou lloc",
  },

  /** Vista d'un lloc. */
  locationView: {
    back: "← Llocs",
    edit: "Editar",
    photoAlt: (name: string) => `Foto de ${name}`,
    notFound: "Lloc no trobat.",
    noObjects: "Cap objecte assignat a aquest lloc.",
    adjustTitle: (name: string) => `Ajustar ${name}`,
    realQuantity: "Quantitat real al compartiment:",
    saveAdjust: "Desar ajust",
    bulkAdjust: "Ajustar estoc",
    bulkSave: "Desar",
    editLocationTitle: "Editar lloc",
    confirmDelete: (name: string) =>
      `Eliminar "${name}"? Desapareixerà dels objectes que el tenien com a ubicació habitual.`,
  },

  /** Formulari de lloc. */
  locationForm: {
    namePlaceholder: "Nom del lloc",
    descriptionPlaceholder: "Descripció (opcional)",
    image: "Imatge del lloc",
    processing: "Processant…",
    changeImage: "Canviar imatge",
    addImage: "Afegir imatge",
  },

  /** Receptes. */
  recipes: {
    title: "Receptes",
    empty: "Cap recepta encara.",
    ingredientsCount: (n: number) => `${n} ingr.`,
    prepTime: (min: number) => `${min}′`,
    newRecipe: "+ Nova recepta",
    newRecipeTitle: "Nova recepta",
    editRecipeTitle: "Editar recepta",
    confirmDelete: (title: string) => `Eliminar la recepta "${title}"?`,
  },

  /** Detall d'una recepta. */
  recipeDetail: {
    cook: "Cuinar",
    needsFire: "Cal foc",
    prepTimeLabel: (min: number) => `${min}′ de preparació`,
    ingredientsPerPerson: "Ingredients (per persona)",
    deletedObject: "Objecte eliminat",
    steps: "Passos",
    cookTitle: (title: string) => `Cuinar ${title}`,
  },

  /** Formulari de recepta. */
  recipeForm: {
    needObjectsFirst:
      "Cal crear objectes abans de fer una recepta (un ingredient ha d'existir primer).",
    close: "Tancar",
    titlePlaceholder: "Títol",
    ingredientsPerPerson: "Ingredients (per persona)",
    removeIngredientAria: "Treure ingredient",
    addIngredient: "+ Afegir ingredient",
    searchIngredientPlaceholder: "Cercar ingredient…",
    pickIngredientTitle: "Afegir ingredient",
    newIngredient: "+ Nou ingredient",
    newObjectTitle: "Nou objecte",
    prepTime: "Temps (min, opcional)",
    needsCooking: "Cal foc",
    steps: "Passos (un per línia, opcional)",
  },

  /** Checklists. */
  checklists: {
    title: "Checklists",
    empty: "Cap checklist. Crea procediments rutinaris.",
    stepsCount: (n: number) => `${n} passos`,
    editTemplateAria: "Editar plantilla",
    newChecklist: "+ Nova checklist",
    newChecklistTitle: "Nova checklist",
    editChecklistTitle: "Editar checklist",
    resetProgress: "Reiniciar progrés",
    titlePlaceholder: "Títol (p.ex. Sortir de cala)",
    stepsLabel: "Passos (un per línia)",
    stepsPlaceholder: "Aixecar àncora\nRecollir defenses\nEngegar motor",
    saveTemplate: "Desar plantilla",
    confirmDelete: (title: string) => `Eliminar la checklist "${title}"?`,
  },

  /** Historial. */
  history: {
    title: "Historial",
    empty: "Cap moviment encara.",
    diners: (n: number) => `${n} pers.`,
    /** Etiquetes de `StockDeltaReason`. */
    reason: {
      cooking: "Cuinat",
      purchase: "Compra",
      adjustment: "Ajust",
    } as Record<string, string>,
    /** Rebobinar / esborrar historial d'estoc. */
    rewindHere: "Rebobinar fins aquí",
    rewindConfirm:
      "Es tornarà l'estoc a l'estat d'aquest punt. Els moviments posteriors s'ignoraran (no s'esborren; ho pots desfer rebobinant a un punt més recent). Continuar?",
    resetAll: "Esborrar tot l'historial d'estoc",
    resetConfirm:
      "Es reiniciarà TOT l'estoc a 0 i s'esborrarà l'historial de moviments. Els objectes, llocs, receptes i checklists ES CONSERVEN. Continuar?",
    rewindEntryTitle: "Rebobinat fins aquí",
    resetEntryTitle: "Estoc reiniciat",
    cutAway: "Ignorat per rebobinat",
    showRewound: (n: number) => (n === 1 ? "1 moviment rebobinat" : `${n} moviments rebobinats`),
  },

  /** Caduca aviat. */
  expiring: {
    title: "Caduca aviat",
    empty: "Res caduca en els pròxims 30 dies.",
    inStock: (qty: string) => `${qty} en estoc`,
    expired: "caducat",
    daysLeft: (n: number) => `${Math.ceil(n)} dies`,
  },

  /** Confirmació d'eliminació. */
  confirmDelete: {
    label: "Eliminar",
    confirm: "Sí, eliminar",
  },

  /** Ajustos. */
  settings: {
    title: "Ajustos",
    yourName: "El teu nom",
    defaultDiners: "Comensals per defecte",
    durationWindowLabel: "Dies per estimar el ritme de consum",
    durationWindowHint: "Finestra per calcular durada (aigua, gas…) al dashboard.",
    lockEdit: "Bloquejar edició",
    lockEditHint:
      "Amaga els botons d'afegir, editar i eliminar per evitar canvis accidentals. Comprar, cuinar i ajustar estoc segueixen disponibles.",
    // — configuració del dashboard —
    dashboard: "Dashboard",
    dashboardHint: "Tria què es mostra a la pàgina d'inici.",
    showFaultsButton: "Botó d'avaries",
    showFaultsButtonHint: "Mostra el botó d'avaries entre Comprar i Mesura.",
    showDocumentsButton: "Botó de documentació",
    showDocumentsButtonHint: "Mostra el botó de documentació tècnica a la pàgina d'inici.",
    docExpiryWarningLabel: "Avís de caducitat de documents (dies)",
    docExpiryWarningHint:
      "Dies abans de la caducitat per avisar a la pàgina de documentació. Només en aquest dispositiu.",
    showDurationSection: "Durada estimada",
    showDurationSectionHint: "Indicadors de durada (aigua, gas…).",
    showResourcesSection: "Recursos (gasoil, aigua, gas)",
    showResourcesSectionHint: "Targeta amb el nivell de gasoil, aigua i gas.",
    showExpiringSection: "Caduca aviat",
    showExpiringSectionHint: "Productes que caduquen properament.",
    sync: "Sincronització",
    localMode: "Mode local",
    lastSync: (rel: string) => `Última: ${rel}`,
    neverSynced: "Sense sincronitzar",
    pendingChanges: (n: number) => `${n} canvis pendents`,
    syncNow: "Sincronitzar ara",
    backup: "Còpia de seguretat",
    exportJson: "Exportar (JSON)",
    importJson: "Importar (JSON)",
    importedEvents: (n: number) => `${n} esdeveniments importats.`,
    importError: "Error en importar el fitxer.",
    installApp: "Instal·lar l'app",
    installOnDevice: "Instal·lar en aquest dispositiu",
    installIosHint:
      "A iPhone: toca el botó de Compartir de Safari i tria «Afegir a la pantalla d'inici».",
    viewHistory: "Veure historial",
    syncDiagnostics: "Diagnòstic de sincronització",
    signOut: "Tancar sessió",
  },
  diagnostics: {
    title: "Diagnòstic de sincronització",
    intro:
      "Aquesta pantalla mostra l'estat intern de la sincronització. Si tens un error de sync, copia tota la informació i passa-la a qui t'ajudi.",
    refresh: "Actualitzar",
    copy: "Copiar tot",
    copied: "Copiat!",
    runSync: "Provar de sincronitzar ara",
    noProblems: "No s'ha detectat cap problema conegut.",
    problemsFound: (n: number) => `${n} possible(s) problema(es) detectat(s):`,
    sectionState: "Estat",
    sectionProblems: "Problemes detectats",
    sectionError: "Últim error de sync",
    sectionPending: "Esdeveniments pendents",
    deviceId: "ID de dispositiu",
    localSeq: "Comptador local (localSeq)",
    maxSeq: "seq màxim al log",
    totalEvents: "Esdeveniments totals",
    pendingEvents: "Pendents d'enviar",
    noError: "Cap error registrat.",
    errorAt: (rel: string) => `Registrat: ${rel}`,
    noPending: "Cap esdeveniment pendent.",
    // Problemes concrets:
    probDuplicate: (n: number) =>
      `${n} parell(s) (dispositiu, seq) duplicat(s). El servidor els rebutja → el push es bloqueja.`,
    probSeqBehind:
      "El comptador local (localSeq) és més baix que el seq més alt del log: els canvis nous reutilitzaran números ja usats i el servidor els rebutjarà.",
    probDeviceMismatch:
      "L'ID de dispositiu a IndexedDB i a localStorage no coincideixen (possible reinici de dades).",
    probNonUuid: (n: number) =>
      `${n} esdeveniment(s) amb id no vàlid que el servidor rebutja.`,
    repair: "Reparar i tornar a sincronitzar",
    repairing: "Reparant…",
    repairDone: (n: number) =>
      n > 0
        ? `${n} esdeveniment(s) reparat(s). Sincronitzant…`
        : "No hi havia res a reparar.",
  },
} as const

export type Dict = typeof ca
