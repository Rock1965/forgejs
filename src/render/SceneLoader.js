
/**
 * Handles the loading of a scene.
 * @constructor FORGE.SceneLoader
 * @param {FORGE.Viewer} viewer - Viewer reference.
 * @extends {FORGE.BaseObject}
 */
FORGE.SceneLoader = function(viewer)
{
    /**
     * Viewer reference
     * @name  FORGE.SceneLoader#_viewer
     * @type {FORGE.Viewer}
     * @private
     */
    this._viewer = viewer;


    this._from ="";
    this._to = "";
    this._transitionUid = "";

    this._loading = false;

    this._onLoadStart = null;
    this._onLoadComplete = null;

    this._onMediaLoadStart = null;
    this._onMediaLoadComplete = null;

    this._onTransitionStart = null;
    this._onTransitionComplete = null;


    FORGE.BaseObject.call(this, "SceneLoader");

    this._boot();
};

FORGE.SceneLoader.prototype = Object.create(FORGE.BaseObject.prototype);
FORGE.SceneLoader.prototype.constructor = FORGE.SceneLoader;

/**
 * Boot sequence.
 * @method FORGE.SceneLoader#_boot
 */
FORGE.SceneLoader.prototype._boot = function()
{

};

/**
 * Load media.
 * @method FORGE.SceneLoader#_loadMedia
 */
FORGE.SceneLoader.prototype._loadMedia = function()
{
    this.log("load media");

    var scene = FORGE.UID.get(this._to);
    scene.media.onLoadComplete.addOnce(this._mediaLoadCompleteHandler, this);
    scene.media.load();

    if(this._onMediaLoadStart !== null)
    {
        this._onMediaLoadStart.dispatch();
    }
};

/**
 * Media load complete handler.
 * @method FORGE.SceneLoader#_mediaLoadCompleteHandler
 */
FORGE.SceneLoader.prototype._mediaLoadCompleteHandler = function()
{
    this.log("media load complete");

    if(this._onMediaLoadComplete !== null)
    {
        this._onMediaLoadComplete.dispatch();
    }

    this._startTransition();
};

/**
 * Starts the transition.
 * @method FORGE.SceneLoader#_startTransition
 */
FORGE.SceneLoader.prototype._startTransition = function()
{
    this.log("start transition");

    if(this._onTransitionStart !== null)
    {
        this._onTransitionStart.dispatch();
    }

    var transitionScreen = false;
    // spherical transition
    if (!transitionScreen && this._from.length > 0)
    {
        var sceneRendererFrom = this._viewer.renderer.scenes.get(this._from);
        var viewports = sceneRendererFrom.viewports.all;
        var sceneToMedia = FORGE.UID.get(this._to).media;
        for (var i=0; i<viewports.length; i++)
        {
            var viewport = viewports[i];
            var backgroundRenderer = viewport.renderer.background;
            if (typeof backgroundRenderer.setMediaTransition === "function")
            {
                backgroundRenderer.setMediaTransition(sceneToMedia, 5);
            }
        }
    }
    else
    {
        this._viewer.renderer.scenes.add(this._to);
    }

    var transition = FORGE.UID.get(this._transitionUid);
    transition.onComplete.addOnce(this._transitionCompleteHandler, this);
    transition.start();
};

/**
 * Transition complete handler.
 * @method FORGE.SceneLoader#_transitionCompleteHandler
 */
FORGE.SceneLoader.prototype._transitionCompleteHandler = function()
{
    this.log("transition complete");

    if(this._onTransitionComplete !== null)
    {
        this._onTransitionComplete.dispatch();
    }

    this._loading = false;

    if (this._onLoadComplete !== null)
    {
        this._onLoadComplete.dispatch();
    }

    var transitionScreen = false;
    if (!transitionScreen)
    {
        this._viewer.renderer.scenes.add(this._to);
        if (this._from.length > 0)
        {
            var sceneRendererFrom = this._viewer.renderer.scenes.get(this._from);
            var viewports = sceneRendererFrom.viewports.all;
            for (var i=0; i<viewports.length; i++)
            {
                var viewport = viewports[i];

                // We store camera of the first background renderer to apply orientation/fov to the next scene
                if (i === 0)
                {
                    var camera = viewport.camera;
                    this._transitionYaw = camera.yaw;
                    this._transitionPitch = camera.pitch;
                    this._transitionRoll = camera.roll;
                    this._transitionFov = camera.fov;
                }

                var backgroundRenderer = viewport.renderer.background;
                if (typeof backgroundRenderer.setMediaTransition === "function")
                {
                    var sceneTo = FORGE.UID.get(this._to);
                    backgroundRenderer.setMediaTransition(null);
                }
            }
        }

        // Apply camera stored settings to sceneTo
        var sceneRendererTo = this._viewer.renderer.scenes.get(this._to);
        var viewports = sceneRendererTo.viewports.all;
        for (var i=0; i<viewports.length; i++)
        {
            var viewport = viewports[i];
            var backgroundRenderer = viewport.renderer.background;

            if (typeof this._transitionYaw === "number")
            {
                viewport.camera.yaw = this._transitionYaw;
            }

            if (typeof this._transitionPitch === "number")
            {
                viewport.camera.pitch = this._transitionPitch;
            }

            if (typeof this._transitionRoll === "number")
            {
                viewport.camera.roll = this._transitionRoll;
            }

            if (typeof this._transitionFov === "number")
            {
                viewport.camera.fov = this._transitionFov;
            }
        }

    }

    if (FORGE.UID.isTypeOf(this._from, "Scene") === true)
    {
        var scene = FORGE.UID.get(this._from);
        scene.unload();
    }

    this._from = "";
    this._to = "";
};

/**
 * Load a scene by its uid.
 * @method FORGE.SceneLoader#load
 * @param {string} sceneUid - The scene uid to load
 * @param {string} transitionUid - The transition uid to use
 */
FORGE.SceneLoader.prototype.load = function(sceneUid, transitionUid)
{
    this.log("load");

    if (this._loading === true)
    {
        this.warn("Can't load multiple scene, scene "+this._to+" is already loading");
        return;
    }

    if (FORGE.UID.isTypeOf(sceneUid, "Scene") === false)
    {
        this.warn("the scene uid "+sceneUid+" does not exists, load aborting");
        return;
    }

    if (FORGE.UID.isTypeOf(transitionUid, "Transition") === true)
    {
        this._transitionUid = transitionUid;
    }
    else
    {
        this.warn("the transition uid "+transitionUid+" does not exists, fallback to the default transition");
        this._transitionUid = this._viewer.transitions.defaultUid;
    }

    this._loading = true;

    this._from = this._viewer.story.sceneUid;
    this._to = sceneUid;

    this._transitionUid = transitionUid || this._viewer.transitions.defaultUid;

    if (this._onLoadStart !== null)
    {
        this._onLoadStart.dispatch();
    }

    this._loadMedia();
};

/**
 * Unload a scene by its uid.
 * @method FORGE.SceneLoader#unload
 * @param {string} sceneUid - The scene uid to unload
 */
FORGE.SceneLoader.prototype.unload = function(sceneUid)
{
    this.log("unload");

    if (FORGE.UID.isTypeOf(sceneUid, "Scene") === false)
    {
        this.warn("the scene uid "+sceneUid+" does not exists, unload aborting");
        return;
    }

    var transitionScreen = true;
    if (transitionScreen === true)
    {
        // Remove the render used for the scene
        this._viewer.renderer.scenes.remove(sceneUid);
    }

    // Unload the scene media
    var scene = FORGE.UID.get(sceneUid);
    scene.media.unload();
};

/**
 * Destroy sequence
 * @method FORGE.SceneLoader#destroy
 */
FORGE.SceneLoader.prototype.destroy = function()
{
    this._viewer = null;

    FORGE.BaseObject.prototype.destroy.call(this);
};

/**
 * Get the loading flag
 * @name FORGE.SceneLoader#loading
 * @readonly
 * @type {boolean}
  */
Object.defineProperty(FORGE.SceneLoader.prototype, "loading",
{
    /** @this {FORGE.SceneLoader} */
    get: function()
    {
        return this._loading;
    }
});

/**
 * Get the current transition.
 * @name FORGE.SceneLoader#transition
 * @readonly
 * @type {FORGE.Transition}
  */
Object.defineProperty(FORGE.SceneLoader.prototype, "transition",
{
    /** @this {FORGE.SceneLoader} */
    get: function()
    {
        if (FORGE.UID.isTypeOf(this._transitionUid, "Transition") === true)
        {
            return FORGE.UID.get(this._transitionUid);
        }

        return null;
    }
});

/**
 * Get the onLoadStart {@link FORGE.EventDispatcher}.
 * @name FORGE.SceneLoader#onLoadStart
 * @readonly
 * @type {FORGE.EventDispatcher}
 */
Object.defineProperty(FORGE.SceneLoader.prototype, "onLoadStart",
{
    /** @this {FORGE.Object3D} */
    get: function()
    {
        if (this._onLoadStart === null)
        {
            this._onLoadStart = new FORGE.EventDispatcher(this);
        }

        return this._onLoadStart;
    }
});

/**
 * Get the onLoadComplete {@link FORGE.EventDispatcher}.
 * @name FORGE.SceneLoader#onLoadComplete
 * @readonly
 * @type {FORGE.EventDispatcher}
 */
Object.defineProperty(FORGE.SceneLoader.prototype, "onLoadComplete",
{
    /** @this {FORGE.Object3D} */
    get: function()
    {
        if (this._onLoadComplete === null)
        {
            this._onLoadComplete = new FORGE.EventDispatcher(this);
        }

        return this._onLoadComplete;
    }
});

/**
 * Get the onMediaLoadStart {@link FORGE.EventDispatcher}.
 * @name FORGE.SceneLoader#onMediaLoadStart
 * @readonly
 * @type {FORGE.EventDispatcher}
 */
Object.defineProperty(FORGE.SceneLoader.prototype, "onMediaLoadStart",
{
    /** @this {FORGE.Object3D} */
    get: function()
    {
        if (this._onMediaLoadStart === null)
        {
            this._onMediaLoadStart = new FORGE.EventDispatcher(this);
        }

        return this._onMediaLoadStart;
    }
});

/**
 * Get the onMediaLoadComplete {@link FORGE.EventDispatcher}.
 * @name FORGE.SceneLoader#onMediaLoadComplete
 * @readonly
 * @type {FORGE.EventDispatcher}
 */
Object.defineProperty(FORGE.SceneLoader.prototype, "onMediaLoadComplete",
{
    /** @this {FORGE.Object3D} */
    get: function()
    {
        if (this._onMediaLoadComplete === null)
        {
            this._onMediaLoadComplete = new FORGE.EventDispatcher(this);
        }

        return this._onMediaLoadComplete;
    }
});

/**
 * Get the onTransitionStart {@link FORGE.EventDispatcher}.
 * @name FORGE.SceneLoader#onTransitionStart
 * @readonly
 * @type {FORGE.EventDispatcher}
 */
Object.defineProperty(FORGE.SceneLoader.prototype, "onTransitionStart",
{
    /** @this {FORGE.Object3D} */
    get: function()
    {
        if (this._onTransitionStart === null)
        {
            this._onTransitionStart = new FORGE.EventDispatcher(this);
        }

        return this._onTransitionStart;
    }
});

/**
 * Get the onTransitionComplete {@link FORGE.EventDispatcher}.
 * @name FORGE.SceneLoader#onTransitionComplete
 * @readonly
 * @type {FORGE.EventDispatcher}
 */
Object.defineProperty(FORGE.SceneLoader.prototype, "onTransitionComplete",
{
    /** @this {FORGE.Object3D} */
    get: function()
    {
        if (this._onTransitionComplete === null)
        {
            this._onTransitionComplete = new FORGE.EventDispatcher(this);
        }

        return this._onTransitionComplete;
    }
});

