class NotesController < ApplicationController
  before_action :set_note, only: [:show, :edit, :update, :destroy]

  # GET /notes
  # GET /notes.json
  def index
    @notes = Note.where(user_id: current_user.id).order('updated_at DESC').limit(10)
  end

  # GET /notes/1
  # GET /notes/1.json
  def show
  end

  # GET /notes/new
  def new
    @note = Note.new
  end

  # GET /notes/1/edit
  def edit
  end

  # POST /notes
  # POST /notes.json
  def create
    @note = Note.new(note_params)
    @note.user_id = current_user.id

    respond_to do |format|
      if @note.save
        @form_id = params[:form_id]
        format.js
        format.html { redirect_to @note, notice: 'Note was successfully created.' }
        format.json { render :show, status: :created, location: @note }
      else
        format.html { render :new }
        format.json { render json: @note.errors, status: :unprocessable_entity }
      end
    end
  end

  # PUT /notes/stars
  def add_star
    note_id = params[:id]
    note = Note.find(note_id)
    respond_to do |format|
      if note.stars.create!(note_id: note_id, user_id: params[:user_id])
        note.star_count = note.star_count + 1
        note.save
        format.json { render json: params, status: :ok }
      else
        format.json { render json: params, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /notes/stars
  def delete_star
    note = Note.find(params[:id])
    respond_to do |format|
      if note.stars.where(user_id: params[:user_id]).destroy_all
        note.star_count = note.star_count - 1
        note.save
        format.json { render json: params, status: :ok }
      else
        format.json { render json: params, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /notes/1
  # PATCH/PUT /notes/1.json
  def update
    respond_to do |format|
      if @note.update(note_params)
        @form_id = params[:form_id]
        format.js
        format.html { redirect_to @note, notice: 'Note was successfully updated.' }
        format.json { render :show, status: :ok, location: @note }
      else
        format.html { render :edit }
        format.json { render json: @note.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /notes/1
  # DELETE /notes/1.json
  def destroy
    @note.destroy
    respond_to do |format|
      @form_id = params[:form_id]
      format.js
      format.html { redirect_to notes_url, notice: 'Note was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_note
      @note = Note.find(params[:id])
      if @note.user_id != current_user.id && @note.private
        raise 'Invalid permissions'
      end
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def note_params
      params.require(:note).permit(:title, :body, :latitude, :longitude, :private,
                                   :user_id, { :album_ids => [] }, :form_id)
    end
end
